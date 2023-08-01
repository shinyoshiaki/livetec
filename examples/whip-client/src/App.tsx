import { WHIPClient } from ".";

//Create whep client
const whip = new WHIPClient();

function App() {
  const play = async () => {
    const pc = new RTCPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    const [video] = stream.getVideoTracks();
    const [audio] = stream.getAudioTracks();

    pc.addTransceiver(video, {
      direction: "sendonly",
      sendEncodings: [
        { rid: "0", scaleResolutionDownBy: 2 },
        { rid: "1", scaleResolutionDownBy: 1 },
      ],
    });
    pc.addTrack(audio, stream);

    const url = "http://localhost:8801/whip";

    //Start viewing
    await whip.publish(pc, url);
  };

  return (
    <div>
      <button onClick={play}>publish</button>
    </div>
  );
}

export default App;
