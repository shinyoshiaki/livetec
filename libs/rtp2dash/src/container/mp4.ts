import Event from "rx.mini";
import { ContainerOutput, AudioTranscoder, VideoTranscoder } from "./base";
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

export class Mp4Audio implements AudioTranscoder {
  onOutput: Event<[ContainerOutput]> = new Event<[ContainerOutput]>();
  audio = new RtpSourceCallback();
  audioRtcp = new RtcpSourceCallback();
  previousDuration = 0;

  constructor(private props: Mp4TranscoderProps) {}

  start(): void {
    {
      const m4a = new MP4Callback([
        {
          kind: "audio",
          codec: this.props.audio ?? "opus",
          clockRate: 48000,
          trackNumber: 1,
        },
      ]);
      const depacketizer = new DepacketizeCallback("opus");
      const time = new RtpTimeCallback(48000);

      this.audio.pipe(time.input);
      time.pipe(depacketizer.input);
      depacketizer.pipe(m4a.inputAudio);

      m4a.pipe(async (o) => {
        if (o.type === "init") {
          this.onOutput.execute({
            operation: "write",
            init: Buffer.from(o.data),
          });
        } else {
          this.previousDuration += o.duration;

          this.onOutput.execute({
            operation: "append",
            chunk: Buffer.from(o.data),
          });
        }
      });
    }
  }

  inputRtcp(packet: RtcpPacket): void {
    this.audioRtcp.input(packet);
  }

  inputRtp(packet: RtpPacket): void {
    this.audio.input(packet);
  }
}

export class Mp4Video implements VideoTranscoder {
  onOutput: Event<[ContainerOutput]> = new Event<[ContainerOutput]>();
  video = new RtpSourceCallback();
  videoRtcp = new RtcpSourceCallback();
  previousDuration = 0;

  constructor(private props: Mp4TranscoderProps) {}

  start(): void {
    const m4v = new MP4Callback([
      {
        width: 640,
        height: 360,
        kind: "video",
        codec: this.props.video ?? "avc1",
        clockRate: 90000,
        trackNumber: 2,
      },
    ]);

    const time = new RtpTimeCallback(90000);
    const depacketizer = new DepacketizeCallback("MPEG4/ISO/AVC", {
      isFinalPacketInSequence: (h) => h.marker,
    });

    this.video.pipe(time.input);
    time.pipe(depacketizer.input);
    depacketizer.pipe(m4v.inputVideo);

    m4v.pipe(async (o) => {
      if (o.type === "init") {
        this.onOutput.execute({
          operation: "write",
          init: Buffer.from(o.data),
        });
      } else if (o.type === "key") {
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

  inputRtcp(packet: RtcpPacket): void {
    this.videoRtcp.input(packet);
  }

  inputRtp(packet: RtpPacket): void {
    this.video.input(packet);
  }
}
