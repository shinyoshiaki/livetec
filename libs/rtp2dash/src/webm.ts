import Event from "rx.mini";
import {
  DepacketizeCallback,
  JitterBufferCallback,
  LipsyncCallback,
  NtpTimeCallback,
  RtcpPacket,
  RtcpSourceCallback,
  RtpPacket,
  RtpSourceCallback,
  SupportedCodec,
  WebmCallback,
  WebmOutput,
  WebmTrack,
} from "werift-rtp";

export interface WebmTranscoderProps {
  video?: VideoCodec;
  audio?: AudioCodec;
}

export class WebmTranscoder {
  webm: WebmCallback;
  audio = new RtpSourceCallback();
  audioRtcp = new RtcpSourceCallback();
  video = new RtpSourceCallback();
  videoRtcp = new RtcpSourceCallback();
  onOutput = new Event<[WebmOutput]>();

  constructor(props: WebmTranscoderProps) {
    if (!props.video && !props.audio) {
      throw new Error("at least one codec must be specified");
    }
    const tracks: WebmTrack[] = [];
    if (props.audio) {
      tracks.push({
        kind: "audio",
        codec: "OPUS",
        clockRate: 48000,
        trackNumber: 1,
      });
    }
    if (props.video) {
      tracks.push({
        width: 640,
        height: 360,
        kind: "video",
        codec: "VP8",
        clockRate: 90000,
        trackNumber: 2,
      });
    }

    const webm = new WebmCallback(tracks, { duration: 1000 * 60 * 60 });
    this.webm = webm;
    let lipsync: LipsyncCallback | undefined;
    if (props.audio && props.video) {
      lipsync = new LipsyncCallback({
        syncInterval: 3000,
        bufferLength: 5,
        fillDummyAudioPacket: Buffer.from([0xf8, 0xff, 0xfe]),
      });
    }

    if (props.audio) {
      const depacketizer = new DepacketizeCallback("opus");
      const ntpTime = new NtpTimeCallback(48000);

      this.audio.pipe(ntpTime.input);
      this.audioRtcp.pipe(ntpTime.input);
      ntpTime.pipe(depacketizer.input);

      if (lipsync) {
        depacketizer.pipe(lipsync.inputAudio);
        lipsync.pipeAudio(webm.inputAudio);
      } else {
        depacketizer.pipe(webm.inputAudio);
      }
    }

    if (props.video) {
      const jitterBuffer = new JitterBufferCallback(90000);
      const ntpTime = new NtpTimeCallback(jitterBuffer.clockRate);
      const depacketizer = new DepacketizeCallback("vp8", {
        isFinalPacketInSequence: (h) => h.marker,
      });

      this.video.pipe(jitterBuffer.input);
      this.videoRtcp.pipe(ntpTime.input);
      jitterBuffer.pipe(ntpTime.input);
      ntpTime.pipe(depacketizer.input);

      if (lipsync) {
        depacketizer.pipe(lipsync.inputVideo);
        lipsync.pipeVideo(webm.inputVideo);
      } else {
        depacketizer.pipe(webm.inputVideo);
      }
    }

    webm.pipe(async (o) => {
      this.onOutput.execute(o);
    });
  }

  inputAudioRtp = (rtp: RtpPacket) => {
    this.audio.input(rtp);
  };

  inputAudioRtcp = (rtcp: RtcpPacket) => {
    this.audioRtcp.input(rtcp);
  };

  inputVideoRtp = (rtp: RtpPacket) => {
    this.video.input(rtp);
  };

  inputVideoRtcp = (rtcp: RtcpPacket) => {
    this.videoRtcp.input(rtcp);
  };
}

export type VideoCodec = Exclude<SupportedCodec, "OPUS">;
export type AudioCodec = "OPUS";
