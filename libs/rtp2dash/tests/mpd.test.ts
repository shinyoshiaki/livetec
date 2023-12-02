import { describe, test } from "vitest";
import { MPD } from "../src/mpd";

describe("mpd", () => {
  test("test", async () => {
    // profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1
    const mpd = new MPD({
      container: "mp4",
      ext: "m4s",
      adaptions: [
        {
          mimeType: "video/avc1.42e01f",
          represententions: [{ width: 1920, height: 1080 }],
        },
        { mimeType: "audio/opus" },
      ],
    });
    const s = mpd.build();
    console.log(s);
    s;
  });
});
