import { MediaStreamTrack } from "werift";
import { dash } from "..";
import { appendFile, writeFile } from "fs/promises";
import { mkdirSync, rmSync } from "fs";

export class DashSource {
  dash: dash.Rtp2Dash;

  constructor() {
    this.dash = new dash.Rtp2Dash({
      codecs: [
        {
          mimeType: "video/avc1.42e01f",
          represententions: [{ width: 1920, height: 1080 }],
        },
        { mimeType: "audio/opus" },
      ],
      container: { format: "mp4", audio: "opus", video: "avc1" },
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
        this.dash.audio.inputRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        // console.log("rtcp audio", p);
        this.dash.audio.inputRtcp(p);
      });
    } else {
      track.onReceiveRtp.subscribe((p) => {
        this.dash.video.inputRtp(p);
      });
      track.onReceiveRtcp.subscribe((p) => {
        // console.log("rtcp video", p);
        this.dash.video.inputRtcp(p);
      });
    }
  }
}
