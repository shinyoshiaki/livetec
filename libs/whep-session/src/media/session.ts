import {
  IceCandidate,
  MediaStreamTrack,
  PeerConfig,
  RTCPeerConnection,
} from "werift";
import { MediaAttributes, parse } from "sdp-transform";
import { randomUUID } from "crypto";
import Event from "rx.mini";

export interface LayersEvent {
  [key: string]: {
    active: {
      id: string;
      simulcastIdx: number;
      bitrate: number;
      width: number;
      height: number;
    }[];
    inactive: {
      id: string;
      simulcastIdx: number;
    }[];
    layers: {
      encodingId: string;
      simulcastIdx?: number;
      spatialLayerId?: number;
      temporalLayerId?: number;
      bitrate?: number;
      width?: number;
      height?: number;
    }[];
  };
}

export type RequestLayer = {
  mediaId?: string;
  encodingId?: string;
  spatialLayerId?: string;
  temporalLayerId?: string;
  maxSpatialLayerId?: string;
  maxTemporalLayerId?: string;
};

export type Events = LayersEvent;

export const supportedEvents = ["layers"];

export class WhepMediaSession {
  readonly id = randomUUID();
  pc: RTCPeerConnection;
  etag = randomUUID();
  event = new Event<[{ event: string; data: Events }]>();
  eventList: string[] = [];

  constructor(
    private props: {
      video?: MediaStreamTrack[];
      audio?: MediaStreamTrack;
      config?: Partial<PeerConfig>;
    }
  ) {
    this.pc = new RTCPeerConnection(props.config);
    this.pc.connectionStateChange.subscribe((state) => {
      console.log("connectionStateChange", state);
    });
    this.pc.iceConnectionStateChange.subscribe((state) => {
      console.log("iceConnectionStateChange", state);
    });
  }

  get tracks() {
    const tracks: MediaStreamTrack[] = [];
    if ((this.props.video ?? []).length > 0) {
      tracks.push(this.props.video![0]);
    }
    if (this.props.audio) {
      tracks.push(this.props.audio);
    }
    return tracks;
  }

  get layers() {
    return this.props.video!.map((_, i) => ({
      encodingId: i.toString(),
    }));
  }

  requestLayer({ encodingId, mediaId }: RequestLayer) {
    if (!(encodingId && mediaId)) {
      return;
    }
    const transceiver = this.pc
      .getTransceivers()
      .find((t) => t.mid === mediaId);
    if (!transceiver) {
      return;
    }
    const track = this.props.video!.find((_, i) => i.toString() === encodingId);
    if (!track) {
      return;
    }
    transceiver.sender.replaceTrack(track);
  }

  requestEvent(events: string[]) {
    this.eventList = events;
  }

  streamEvent = () => {
    if (
      this.eventList.includes("layers") &&
      (this.props.video ?? []).length > 0
    ) {
      const event: LayersEvent = {};
      const transceiver = this.pc
        .getTransceivers()
        .find((t) => t.kind === "video");
      if (transceiver) {
        event[transceiver.mid!] = {
          active: [],
          inactive: [],
          layers: this.layers,
        };
      }
      this.event.execute({ event: "layers", data: event });
    }
  };

  async setRemoteOffer(sdp: string) {
    const obj = parse(sdp);
    const media = obj.media;

    for (const m of media) {
      if (m.type === "application") {
        continue;
      }
      const track = this.tracks.find((t) => t.kind === m.type);
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
