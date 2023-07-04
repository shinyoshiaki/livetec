import { useRef } from "react";
import { WHEPClient } from ".";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = async () => {
    const video = videoRef.current!;

    const pc = new RTCPeerConnection();

    //Add recv only transceivers
    pc.addTransceiver("audio");
    pc.addTransceiver("video");

    pc.ontrack = (event) => {
      const track = event.track;
      if (!video.srcObject) {
        video.srcObject = new MediaStream([track]);
      } else {
        (video.srcObject as MediaStream).addTrack(track);
      }
    };

    //Create whep client
    const whep = new WHEPClient();

    const url = "http://localhost:8801/whep";

    //Start viewing
    await whep.view(pc, url);
  };

  return (
    <div>
      <video ref={videoRef} controls autoPlay />
      <button onClick={play}>play</button>
    </div>
  );
}

export default App;
