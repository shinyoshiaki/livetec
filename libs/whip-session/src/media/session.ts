import {
  IceCandidate,
  MediaStreamTrack,
  PeerConfig,
  RTCPeerConnection,
} from "werift";
import { MediaAttributes, parse } from "sdp-transform";
import { randomUUID } from "crypto";
import Event from "rx.mini";

export class WhepMediaSession {
  readonly id = randomUUID();
  pc: RTCPeerConnection;
  etag = randomUUID();
  onTrack = new Event<[MediaStreamTrack]>();

  constructor(private config: Partial<PeerConfig> = {}) {
    this.pc = new RTCPeerConnection(config);
    this.pc.connectionStateChange.subscribe((state) => {
      console.log("connectionStateChange", state);
    });
    this.pc.iceConnectionStateChange.subscribe((state) => {
      console.log("iceConnectionStateChange", state);
    });
  }

  async setRemoteOffer(sdp: string) {
    this.pc.onTrack.subscribe((track) => {
      this.onTrack.execute(track);
    });

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return { answer: this.pc.localDescription!.sdp, etag: this.etag };
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
