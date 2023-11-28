import { MediaStreamTrack } from "werift";
import { dash } from "..";
import { appendFile, writeFile } from "fs/promises";
import { mkdirSync, rmSync } from "fs";

export class DashSource {
  dash: dash.Rtp2Dash;

  constructor() {
    this.dash = new dash.Rtp2Dash({
      audio: "opus",
      video: "avc1",
      dashCodecs: ["avc1.42E01F", "opus"],
      container: "mp4",
    });

    try {
      rmSync("./dash", { recursive: true });
    } catch (error) {}
    mkdirSync("./dash", { recursive: true });

    this.dash.onOutput.subscribe(async (o) => {
      const filename = "./dash/" + o.filename;

      switch (o.operation) {
        case "write":
          {
            await writeFile(filename, o.data);
          }
          break;
        case "append":
          {
            await appendFile(filename, o.data);
          }
          break;
      }
    });
    this.dash.start();
  }

  register(track: MediaStreamTrack) {
    if (track.kind === "audio") {
      track.onReceiveRtp.subscribe((p) => {
        this.dash.container.inputAudioRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        // console.log("rtcp audio", p);
        this.dash.container.inputAudioRtcp(p);
      });
    } else {
      track.onReceiveRtp.subscribe((p) => {
        this.dash.container.inputVideoRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        // console.log("rtcp video", p);
        this.dash.container.inputVideoRtcp(p);
      });
    }
  }
}
