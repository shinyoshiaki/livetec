import {
  IceCandidate,
  MediaStreamTrack,
  PeerConfig,
  RTCPeerConnection,
  useSdesRTPStreamId,
} from "werift";
import { MediaAttributes, parse, write } from "sdp-transform";
import { randomUUID } from "crypto";
import Event from "rx.mini";

export class WhipMediaSession {
  readonly id = randomUUID();
  pc: RTCPeerConnection;
  etag = randomUUID();
  onTrack = new Event<[MediaStreamTrack]>();

  constructor(config: Partial<PeerConfig> = {}) {
    this.pc = new RTCPeerConnection({
      ...config,
      headerExtensions: { video: [useSdesRTPStreamId()] },
    });
    this.pc.connectionStateChange.subscribe((state) => {
      console.log("connectionStateChange", state);
    });
    this.pc.iceConnectionStateChange.subscribe((state) => {
      console.log("iceConnectionStateChange", state);
    });
  }

  async setRemoteOffer(sdp: string) {
    console.log("setRemoteOffer", sdp);

    this.pc.onTransceiverAdded.subscribe((transceiver) => {
      transceiver.onTrack.subscribe((track) => {
        console.log("onTrack", track.kind);
        this.onTrack.execute(track);

        track.onReceiveRtp.once((rtp) => {
          if (track.kind === "video") {
            setInterval(() => {
              transceiver.receiver.sendRtcpPLI(rtp.header.ssrc);
            }, 1000);
          }
        });
      });
    });

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    const obj = parse(this.pc.localDescription!.sdp);

    return { answer: write(obj), etag: this.etag };
  }

  async iceRequest({ etag, candidate }: { etag: string; candidate: string }) {
    if (etag !== this.etag) {
      // throw new Error("invalid etag");
    }

    const obj = parse(candidate);
    if (obj.media.length > 0) {
      await this.setRemoteIceCandidate(obj.media[0].candidates ?? []);
    } else {
      throw new Error("ice restart is not supported yet");
    }
  }

  private async setRemoteIceCandidate(
    candidates: NonNullable<MediaAttributes["candidates"]>
  ) {
    for (const candidate of candidates) {
      await this.pc.addIceCandidate(
        new IceCandidate(
          candidate.component,
          candidate.foundation,
          candidate.ip,
          candidate.port,
          Number(candidate.priority),
          candidate.transport,
          candidate.type
        ).toJSON()
      );
    }
  }
}
