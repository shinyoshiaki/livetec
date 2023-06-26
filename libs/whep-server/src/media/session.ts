import { MediaStreamTrack, RTCPeerConnection } from "werift";
import { parse } from "sdp-transform";

export class WhepServerSession {
  pc: RTCPeerConnection;

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

    return this.pc.localDescription!.sdp;
  }
}
