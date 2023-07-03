import { IceCandidate, MediaStreamTrack, RTCPeerConnection } from "werift";
import { MediaAttributes, parse } from "sdp-transform";
import { randomUUID } from "crypto";

export class WhepMediaSession {
  pc: RTCPeerConnection;
  etag = randomUUID();

  constructor({ tracks }: { tracks: MediaStreamTrack[] }) {
    this.pc = new RTCPeerConnection();
    for (const track of tracks) {
      this.pc.addTransceiver(track, { direction: "sendonly" });
    }
  }

  async setRemoteOffer(sdp: string) {
    const obj = parse(sdp);
    const media = obj.media;

    if (media.length !== this.pc.getTransceivers().length) {
      throw new Error("invalid media length");
    }
    for (const t of this.pc.getTransceivers()) {
      if (!media.map((m) => m.type).includes(t.kind)) {
        throw new Error("invalid media type");
      }
    }

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return { sdp: this.pc.localDescription!.sdp, etag: this.etag };
  }

  async setIceRequest({
    etag,
    candidate,
  }: {
    etag: string;
    candidate: string;
  }) {
    if (etag !== this.etag) {
      throw new Error("invalid etag");
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
