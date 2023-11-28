import Event from "rx.mini";
import {
  DepacketizeCallback,
  JitterBufferCallback,
  LipsyncCallback,
  RtcpPacket,
  RtcpSourceCallback,
  RtpPacket,
  RtpSourceCallback,
  RtpTimeCallback,
  SupportedCodec,
  WebmCallback,
  WebmTrack,
} from "werift-rtp";
import { ContainerOutput, ContainerTranscoder } from "./base";

const dummyOpusPacket = Buffer.from([0xf8, 0xff, 0xfe]);

export interface WebmTranscoderProps {
  video?: VideoCodec;
  audio?: AudioCodec;
}

export class WebmTranscoder implements ContainerTranscoder {
  webm: WebmCallback;
  audio = new RtpSourceCallback();
  audioRtcp = new RtcpSourceCallback();
  video = new RtpSourceCallback();
  videoRtcp = new RtcpSourceCallback();
  onOutput = new Event<[ContainerOutput]>();

  constructor(private props: WebmTranscoderProps) {}

  start() {
    if (!this.props.video && !this.props.audio) {
      throw new Error("at least one codec must be specified");
    }
    const tracks: WebmTrack[] = [];
    if (this.props.audio) {
      tracks.push({
        kind: "audio",
        codec: this.props.audio,
        clockRate: 48000,
        trackNumber: 1,
      });
    }
    if (this.props.video) {
      tracks.push({
        width: 640,
        height: 360,
        kind: "video",
        codec: this.props.video,
        clockRate: 90000,
        trackNumber: 2,
      });
    }

    const webm = new WebmCallback(tracks, {
      duration: 1000 * 60 * 60,
      strictTimestamp: true,
    });
    this.webm = webm;
    let lipsync: LipsyncCallback | undefined;
    if (this.props.audio && this.props.video) {
      lipsync = new LipsyncCallback({
        syncInterval: 3_000,
        bufferLength: 5,
        fillDummyAudioPacket: dummyOpusPacket,
      });
    }

    if (this.props.audio) {
      const depacketizer = new DepacketizeCallback(this.props.audio);
      const time = new RtpTimeCallback(48000);

      this.audio.pipe(time.input);
      this.audioRtcp.pipe(time.input);
      time.pipe(depacketizer.input);

      if (lipsync) {
        depacketizer.pipe(lipsync.inputAudio);
        lipsync.pipeAudio(webm.inputAudio);
      } else {
        depacketizer.pipe(webm.inputAudio);
      }
    }

    if (this.props.video) {
      const jitterBuffer = new JitterBufferCallback(90000);
      const time = new RtpTimeCallback(90000);
      const depacketizer = new DepacketizeCallback(this.props.video, {
        isFinalPacketInSequence: (h) => h.marker,
      });

      this.video.pipe(jitterBuffer.input);
      this.videoRtcp.pipe((o) => {
        time.input(o);
      });
      jitterBuffer.pipe(time.input);
      time.pipe((o) => {
        depacketizer.input(o);
      });
      if (lipsync) {
        depacketizer.pipe(lipsync.inputVideo);
        lipsync.pipeVideo(webm.inputVideo);
      } else {
        depacketizer.pipe((o) => {
          webm.inputVideo(o);
        });
      }
    }

    webm.pipe(async (o) => {
      if (o.saveToFile) {
        if (o.kind === "initial") {
          this.onOutput.execute({
            operation: "write",
            init: o.saveToFile,
          });
        } else if (o.kind === "cluster") {
          this.onOutput.execute({
            operation: "write",
            chunk: o.saveToFile,
            previousDuration: o.previousDuration,
          });
        } else if (o.kind === "block") {
          this.onOutput.execute({
            operation: "append",
            chunk: o.saveToFile,
          });
        }
      }
    });
  }

  inputAudioRtp = (rtp: RtpPacket) => {
    this.audio.input(rtp.clone());
  };

  inputAudioRtcp = (rtcp: RtcpPacket) => {
    this.audioRtcp.input(rtcp);
  };

  inputVideoRtp = (rtp: RtpPacket) => {
    if (rtp.payload.length === 0) {
      console.log("empty payload");
      return;
    }
    const cloned = rtp.clone();
    this.video.input(cloned);
  };

  inputVideoRtcp = (rtcp: RtcpPacket) => {
    this.videoRtcp.input(rtcp);
  };
}

export type VideoCodec = Exclude<SupportedCodec, "OPUS">;
export type AudioCodec = "OPUS";
