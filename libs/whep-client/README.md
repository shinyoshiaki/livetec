https://github.com/medooze/whip-whep-js

# Example

```js
import { WHEPClient } from "whep.js";

//Create peerconnection
const pc = (window.pc = new RTCPeerConnection());

//Add recv only transceivers
pc.addTransceiver("audio");
pc.addTransceiver("video");

pc.ontrack = (event) => {
  console.log(event);
  if (event.track.kind == "video")
    document.querySelector("video").srcObject = event.streams[0];
};

//Create whep client
const whep = new WHEPClient();

const url = "https://whep.test/whep/endpoint";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtaWxsaWNhc3QiOnsidHlwZSI6IlN1YnNjcmliZSIsInNlcnZlcklkIjoidmlld2VyMSIsInN0cmVhbUFjY291bnRJZCI6InRlc3QiLCJzdHJlYW1OYW1lIjoidGVzdCJ9LCJpYXQiOjE2NzY2NDkxOTd9.ZE8Ftz9qiS04zTKBqP1MHZTOh8dvI73FBraleQM9h1A";

//Start viewing
whep.view(pc, url, token);
```
