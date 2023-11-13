import { MediaStreamTrack } from "werift";
import { dash } from "..";
import { appendFile, writeFile } from "fs/promises";
import { mkdirSync, rmSync } from "fs";

export class DashSource {
  dash = new dash.Rtp2Dash({
    audio: "OPUS",
    video: "MPEG4/ISO/AVC",
    dashCodecs: ["avc1.42E01F", "opus"],
  });

  constructor() {
    try {
      rmSync("./dash", { recursive: true });
    } catch (error) {}
    mkdirSync("./dash", { recursive: true });

    this.dash.onOutput.subscribe(async (o) => {
      switch (o.operation) {
        case "write":
          {
            await writeFile("./dash/" + o.filename, o.data);
          }
          break;
        case "append":
          {
            await appendFile("./dash/" + o.filename, o.data);
          }
          break;
      }
    });
    this.dash.start();
  }

  register(track: MediaStreamTrack) {
    if (track.kind === "audio") {
      track.onReceiveRtp.subscribe((p) => {
        this.dash.webm.inputAudioRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        console.log("rtcp audio", p);
        this.dash.webm.inputAudioRtcp(p);
      });
    } else {
      track.onReceiveRtp.subscribe((p) => {
        this.dash.webm.inputVideoRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        console.log("rtcp video", p);
        this.dash.webm.inputVideoRtcp(p);
      });
    }
  }
}
