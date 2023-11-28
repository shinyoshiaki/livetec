import Event from "rx.mini";
import { ContainerOutput, ContainerTranscoder } from "./base";
import {
  DepacketizeCallback,
  JitterBufferCallback,
  MP4Callback,
  NtpTimeCallback,
  RtcpPacket,
  RtcpSourceCallback,
  RtpPacket,
  RtpSourceCallback,
  RtpTimeCallback,
} from "../imports/rtp";

export interface Mp4TranscoderProps {
  video?: "avc1";
  audio?: "opus";
}

export class Mp4Transcoder implements ContainerTranscoder {
  onOutput: Event<[ContainerOutput]> = new Event<[ContainerOutput]>();
  audio = new RtpSourceCallback();
  video = new RtpSourceCallback();
  audioRtcp = new RtcpSourceCallback();
  videoRtcp = new RtcpSourceCallback();
  previousDuration = 0;

  constructor(private props: Mp4TranscoderProps) {}

  start(): void {
    const mp4 = new MP4Callback([
      {
        kind: "audio",
        codec: this.props.audio ?? "opus",
        clockRate: 48000,
        trackNumber: 1,
      },
      {
        width: 640,
        height: 360,
        kind: "video",
        codec: this.props.video ?? "avc1",
        clockRate: 90000,
        trackNumber: 2,
      },
    ]);

    {
      const depacketizer = new DepacketizeCallback("opus");
      const time = new RtpTimeCallback(48000);

      this.audio.pipe(time.input);
      time.pipe(depacketizer.input);
      depacketizer.pipe(mp4.inputAudio);
    }
    {
      const time = new RtpTimeCallback(90000);
      const depacketizer = new DepacketizeCallback("MPEG4/ISO/AVC", {
        isFinalPacketInSequence: (h) => h.marker,
      });

      this.video.pipe(time.input);
      time.pipe(depacketizer.input);
      depacketizer.pipe(mp4.inputVideo);
    }

    mp4.pipe(async (o) => {
      console.log(o.kind, o.duration);

      if (o.type === "init") {
        this.onOutput.execute({
          operation: "write",
          init: Buffer.from(o.data),
        });
      } else if (o.type === "key" && o.kind === "video") {
        const previousDuration =
          this.previousDuration > 0 ? this.previousDuration : undefined;

        this.onOutput.execute({
          operation: "write",
          chunk: Buffer.from(o.data),
          previousDuration,
        });

        this.previousDuration = 0;
      } else {
        this.previousDuration += o.duration;

        this.onOutput.execute({
          operation: "append",
          chunk: Buffer.from(o.data),
        });
      }
    });
  }

  inputAudioRtcp(packet: RtcpPacket): void {
    this.audioRtcp.input(packet);
  }

  inputAudioRtp(packet: RtpPacket): void {
    this.audio.input(packet);
  }

  inputVideoRtcp(packet: RtcpPacket): void {
    this.videoRtcp.input(packet);
  }

  inputVideoRtp(packet: RtpPacket): void {
    this.video.input(packet);
  }
}
