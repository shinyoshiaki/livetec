import { useRef } from "react";
import { WHIPClient } from ".";

//Create whep client
const whip = new WHIPClient();

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = async () => {
    const video = videoRef.current!;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    video.srcObject = stream;

    const pc = new RTCPeerConnection();

    //Send all tracks
    for (const track of stream.getTracks()) {
      //You could add simulcast too here
      pc.addTrack(track);
    }

    const url = "http://localhost:8801/whip";

    //Start viewing
    await whip.publish(pc, url);
  };

  return (
    <div>
      <button onClick={play}>publish</button>
      <video ref={videoRef} controls autoPlay muted />
    </div>
  );
}

export default App;
