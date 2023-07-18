const ianaSSE = "urn:ietf:params:whep:ext:core:server-sent-events";
export const ianaLayer = "urn:ietf:params:whep:ext:core:layer";

export class WHEPClient extends EventTarget {
  iceUsername?: string;
  icePassword?: string;
  candidates: RTCIceCandidate[] = [];
  endOfCandidates = false;
  pc?: RTCPeerConnection;
  token?: string;
  iceTrickleTimeout: any;
  resourceURL?: URL;
  eventsUrl?: URL;
  layerUrl?: URL;
  eventSource?: EventSource;
  restartIce?: boolean;

  constructor() {
    super();
  }

  private iceUsernameFromSDP(sdp: string) {
    return sdp.match(/a=ice-ufrag:(.*)\r\n/)![1];
  }

  private icePasswordFromSDP(sdp: string) {
    return sdp.match(/a=ice-pwd:(.*)\r\n/)![1];
  }

  async view(pc: RTCPeerConnection, url: string, token?: string) {
    //If already publishing
    if (this.pc) throw new Error("Already viewing");

    //Store pc object and token
    this.token = token;
    this.pc = pc;

    //Listen for state change events
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          // The connection has become fully connected
          break;
        case "disconnected":
        case "failed":
          // One or more transports has terminated unexpectedly or in an error
          break;
        case "closed":
          // The connection has been closed
          break;
      }
    };

    //Listen for candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        //Ignore candidates not from the first m line
        if (event.candidate.sdpMLineIndex ?? 0 > 0)
          //Skip
          return;
        //Store candidate
        this.candidates.push(event.candidate);
      } else {
        //No more candidates
        this.endOfCandidates = true;
      }
      //Schedule trickle on next tick
      if (!this.iceTrickleTimeout)
        this.iceTrickleTimeout = setTimeout(() => this.trickle(), 0);
    };
    //Create SDP offer
    const offer = await pc.createOffer();

    //Request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/sdp",
    };

    //If token is set
    if (token) headers["Authorization"] = "Bearer " + token;

    //Do the post request to the WHEP endpoint with the SDP offer
    const fetched = await fetch(url, {
      method: "POST",
      body: offer.sdp,
      headers,
    });

    if (!fetched.ok)
      throw new Error("Request rejected with status " + fetched.status);
    if (!fetched.headers.get("location"))
      throw new Error("Response missing location header");

    //Get the resource url
    this.resourceURL = new URL(fetched.headers.get("location")!, url);

    //Get the links
    const links = {};

    //If the response contained any
    if (fetched.headers.has("link")) {
      //Get all links headers
      const linkHeaders = fetched.headers.get("link")!.split(/,\s+(?=<)/);

      //For each one
      for (const header of linkHeaders) {
        try {
          let rel;
          const params = {};

          //Split in parts
          const items = header.split(";");
          //Create url server
          const url = items[0]
            .trim()
            .replace(/<(.*)>/, "$1")
            .trim();
          //For each other item
          for (let i = 1; i < items.length; ++i) {
            //Split into key/val
            const subitems = items[i].split(/=(.*)/);
            //Get key
            const key = subitems[0].trim();
            //Unquote value
            const value = subitems[1]
              ? subitems[1].trim().replaceAll('"', "").replaceAll("'", "")
              : subitems[1];
            //Check if it is the rel attribute
            if (key == "rel")
              //Get rel value
              rel = value;
            //Unquote value and set them
            else params[key] = value;
          }
          //Ensure it is an ice server
          if (!rel) continue;
          if (!links[rel]) links[rel] = [];
          //Add to config
          links[rel].push({ url, params });
        } catch (e) {
          console.error(e);
        }
      }
    }

    console.log({ links });

    //Get extensions url
    if (links.hasOwnProperty(ianaSSE))
      //Get url
      this.eventsUrl = new URL(links[ianaSSE][0].url, url);
    if (links.hasOwnProperty(ianaLayer))
      this.layerUrl = new URL(links[ianaLayer][0].url, url);

    //If we have an event url
    if (this.eventsUrl) {
      //Get supported events
      const serverEvents = links[ianaSSE][0].params.events;
      const events = serverEvents
        ? serverEvents.split(",")
        : ["active", "inactive", "layers", "viewercount"];
      //Request headers
      const headers = {
        "Content-Type": "application/json",
      };

      //If token is set
      if (this.token) headers["Authorization"] = "Bearer " + this.token;

      //Do the post request to the WHIP resource
      fetch(this.eventsUrl, {
        method: "POST",
        body: JSON.stringify(events),
        headers,
      }).then((fetched) => {
        //If the event channel could be created
        if (!fetched.ok) return;
        //Get the resource url
        const sseUrl = new URL(
          fetched.headers.get("location") ?? "",
          this.eventsUrl
        );
        //Open it
        this.eventSource = new EventSource(sseUrl);
        this.eventSource.onopen = (event) => console.log(event);
        this.eventSource.onerror = (event) => console.log(event);
        //Listen for events
        this.eventSource.onmessage = (event) => {
          (event as any).message = JSON.parse(event.data);
          console.dir(event);
          this.dispatchEvent(
            new CustomEvent(event.type, { detail: JSON.parse(event.data) })
          );
        };
      });
    }

    //Get current config
    const config = pc.getConfiguration();

    //If it has ice server info and it is not overriden by the client
    if (
      (!config.iceServers || !config.iceServers.length) &&
      links.hasOwnProperty("ice-servers")
    ) {
      //ICe server config
      config.iceServers = [];

      //For each one
      for (const server of links["ice-servers"]) {
        try {
          //Create ice server
          const iceServer = {
            urls: server.url,
          };
          //For each other param
          for (const [key, value] of Object.entries(server.params)) {
            //Get key in cammel case
            const cammelCase = key.replace(/([-_][a-z])/gi, ($1) =>
              $1.toUpperCase().replace("-", "").replace("_", "")
            );
            //Unquote value and set them
            iceServer[cammelCase] = value;
          }
          //Add to config
          //config.iceServers.push(iceServer);
        } catch (e) {}
      }

      //If any configured
      if (config.iceServers.length)
        //Set it
        pc.setConfiguration(config);
    }

    //Get the SDP answer
    const answer = await fetched.text();

    //Schedule trickle on next tick
    if (!this.iceTrickleTimeout)
      this.iceTrickleTimeout = setTimeout(() => this.trickle(), 0);

    //Set local description
    await pc.setLocalDescription(offer);

    // TODO: chrome is returning a wrong value, so don't use it for now
    //try {
    //	//Get local ice properties
    //	const local = this.pc.getTransceivers()[0].sender.transport.iceTransport.getLocalParameters();
    //	//Get them for transport
    //	this.iceUsername = local.usernameFragment;
    //	this.icePassword = local.password;
    //} catch (e) {
    //Fallback for browsers not supporting ice transport
    this.iceUsername = this.iceUsernameFromSDP(offer.sdp!);
    this.icePassword = this.icePasswordFromSDP(offer.sdp!);
    //}

    //And set remote description
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
  }

  restart() {
    //Set restart flag
    this.restartIce = true;

    //Schedule trickle on next tick
    if (!this.iceTrickleTimeout)
      this.iceTrickleTimeout = setTimeout(() => this.trickle(), 0);
  }

  async trickle() {
    //Clear timeout
    this.iceTrickleTimeout = null;

    //Check if there is any pending data
    if (
      !(this.candidates.length || this.endOfCandidates || this.restartIce) ||
      !this.resourceURL ||
      !this.pc
    )
      //Do nothing
      return;

    //Get data
    const candidates = this.candidates;
    let endOfCandidates = this.endOfCandidates;
    const restartIce = this.restartIce;

    //Clean pending data before async operation
    this.candidates = [];
    this.endOfCandidates = false;
    this.restartIce = false;

    //If we need to restart
    if (restartIce) {
      //Restart ice
      this.pc.restartIce();
      //Create a new offer
      const offer = await this.pc.createOffer({ iceRestart: true });
      //Update ice
      this.iceUsername = this.iceUsernameFromSDP(offer.sdp!);
      this.icePassword = this.icePasswordFromSDP(offer.sdp!);
      //Set it
      await this.pc.setLocalDescription(offer);
      //Clean end of candidates flag as new ones will be retrieved
      endOfCandidates = false;
    }
    //Prepare fragment
    let fragment =
      "a=ice-ufrag:" +
      this.iceUsername +
      "\r\n" +
      "a=ice-pwd:" +
      this.icePassword +
      "\r\n";
    //Get peerconnection transceivers
    const transceivers = this.pc.getTransceivers();
    //Get medias
    const medias: {
      [mid: string]: {
        mid: string;
        kind: string;
        candidates: RTCIceCandidate[];
      };
    } = {};
    //If doing something else than a restart
    if (candidates.length || endOfCandidates)
      //Create media object for first media always
      medias[transceivers[0].mid!] = {
        mid: transceivers[0].mid!,
        kind: transceivers[0].receiver.track.kind,
        candidates: [],
      };
    //For each candidate
    for (const candidate of candidates) {
      //Get mid for candidate
      const mid = candidate.sdpMid!;
      //Get associated transceiver
      const transceiver = transceivers.find((t) => t.mid == mid)!;
      //Get media
      let media = medias[mid];
      //If not found yet
      if (!media)
        //Create media object
        media = medias[mid] = {
          mid,
          kind: transceiver.receiver.track.kind,
          candidates: [],
        };
      //Add candidate
      media.candidates.push(candidate);
    }
    //For each media
    for (const media of Object.values(medias)) {
      //Add media to fragment
      fragment +=
        "m=" + media.kind + " 9 RTP/AVP 0\r\n" + "a=mid:" + media.mid + "\r\n";
      //Add candidate
      for (const candidate of media.candidates)
        fragment += "a=" + candidate.candidate + "\r\n";
      if (endOfCandidates) fragment += "a=end-of-candidates\r\n";
    }

    //Request headers
    const headers = {
      "Content-Type": "application/trickle-ice-sdpfrag",
    };

    //If token is set
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    //Do the post request to the WHEP resource
    const fetched = await fetch(this.resourceURL, {
      method: "PATCH",
      body: fragment,
      headers,
    });
    if (!fetched.ok)
      throw new Error("Request rejected with status " + fetched.status);

    //If we have got an answer
    if (fetched.status == 200) {
      //Get the SDP answer
      const answer = await fetched.text();
      //Get remote icename and password
      const iceUsername = this.iceUsernameFromSDP(answer);
      const icePassword = this.icePasswordFromSDP(answer);

      //Get current remote rescription
      const remoteDescription = {
        sdp: this.pc.remoteDescription!.sdp,
        type: this.pc.remoteDescription!.type,
      };

      //Patch
      remoteDescription.sdp = remoteDescription.sdp.replaceAll(
        /(a=ice-ufrag:)(.*)\r\n/gm,
        "$1" + iceUsername + "\r\n"
      );
      remoteDescription.sdp = remoteDescription.sdp.replaceAll(
        /(a=ice-pwd:)(.*)\r\n/gm,
        "$1" + icePassword + "\r\n"
      );

      //Set it
      await this.pc.setRemoteDescription(remoteDescription);
    }
  }

  async mute(muted) {
    //Request headers
    const headers = {
      "Content-Type": "application/json",
    };

    //If token is set
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    //Do the post request to the WHIP resource
    const fetched = await fetch(this.resourceURL!, {
      method: "POST",
      body: JSON.stringify(muted),
      headers,
    });
  }

  async selectLayer(
    layer: Partial<{
      mediaId: string;
      encodingId: string;
      spatialLayerId: string;
      temporalLayerId: string;
      maxSpatialLayerId: string;
      maxTemporalLayerId: string;
    }>
  ) {
    if (!this.layerUrl)
      throw new Error("WHIP resource does not support layer selection");

    //Request headers
    const headers = {
      "Content-Type": "application/json",
    };

    //If token is set
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    //Do the post request to the WHIP resource
    const fetched = await fetch(this.layerUrl, {
      method: "POST",
      body: JSON.stringify(layer),
      headers,
    });
  }

  async unselectLayer() {
    if (!this.layerUrl)
      throw new Error("WHIP resource does not support layer selection");

    //Request headers
    const headers = {};

    //If token is set
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    //Do the post request to the WHIP resource
    const fetched = await fetch(this.layerUrl, {
      method: "DELETE",
      headers,
    });
  }

  async stop() {
    if (!this.pc) {
      // Already stopped
      return;
    }

    //Cancel any pending timeout
    this.iceTrickleTimeout = clearTimeout(this.iceTrickleTimeout);

    //Close peerconnection
    this.pc.close();

    //Null
    this.pc = undefined;

    //If we don't have the resource url
    if (!this.resourceURL)
      throw new Error("WHEP resource url not available yet");

    //Request headers
    const headers = {};

    //If token is set
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    //Send a delete
    await fetch(this.resourceURL, {
      method: "DELETE",
      headers,
    });
  }
}
