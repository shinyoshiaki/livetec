import {
  IceCandidate,
  MediaStreamTrack,
  PeerConfig,
  RTCPeerConnection,
} from "werift";
import { MediaAttributes, parse } from "sdp-transform";
import { randomUUID } from "crypto";

export class WhepMediaSession {
  readonly id = randomUUID();
  pc: RTCPeerConnection;
  etag = randomUUID();

  constructor(
    private props: { tracks: MediaStreamTrack[]; config?: Partial<PeerConfig> }
  ) {
    this.pc = new RTCPeerConnection(props.config);
    this.pc.connectionStateChange.subscribe((state) => {
      console.log("connectionStateChange", state);
    });
    this.pc.iceConnectionStateChange.subscribe((state) => {
      console.log("iceConnectionStateChange", state);
    });
  }

  async setRemoteOffer(sdp: string) {
    const obj = parse(sdp);
    const media = obj.media;

    for (const m of media) {
      if (m.type === "application") {
        continue;
      }
      const track = this.props.tracks.find((t) => t.kind === m.type);
      if (track) {
        this.pc.addTransceiver(track, { direction: "sendonly" });
      }
    }

    if (media.length !== this.pc.getTransceivers().length) {
      throw new Error("invalid media length");
    }

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
