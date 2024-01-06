<style>

</style>

<script lang='ts'>
	import { onMount } from 'svelte';
	import { io } from 'socket.io-client'
	import { v4 } from 'uuid';
	import Box from './Box.svelte';
	import '@fortawesome/fontawesome-free/css/all.min.css'
	/** @type {import('./$types').LayoutData} */


	export let data;
    let roomName = data.name;

	let videos = new Map();
	let peers = new Map();
	let sharesIn = new Map();
	let shareCallsOut = new Map();
	let shareCallsIn = new Map();

	var camera = true;
	var muted = false;
	var screenshare = false;
	var screenshareTracks = null;
	var myShare = null;
	var username = "User-" + Math.floor(Math.random()*(999-100+1)+100);
	let screenshareStream = null;
	let superGrid = {};
	let boxes = [];

	onMount(() => {
		let userPrompt = prompt("Enter username", username);
		if (userPrompt) username = userPrompt;

		navigator.getUserMedia =
			navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia;

		const socket = io("https://fluorescent-profuse-acorn.glitch.me");
		// const socket = io("http://localhost:3000");

		const videoGrid = document.getElementById('video-grid');
		const superVid = document.getElementById('super-video');
		

	

		socket.on("connect", () => {
			console.log("Successfully connected to socket");
		});

		var myId = "";

		
		import("peerjs").then(({ default: Peer }) => {
			const peer = new Peer({host:'https://abalone-sticky-plywood.glitch.me',
								secure:true,
								port:3000,
								path: '/'});

			peer.on('open', id => {
				// emit join room upon open
				myId = id;
				socket.emit('join-room', roomName, id, username, camera, muted)
			})
			
			// get user camera
			navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			}).then(stream => {
				// call
				peer.on('call', call => {
					// answer
					let streamType = call.metadata.type;
					let peerUsername = "";
					let peerCamera = true;
					let peerMuted = false;
					if (streamType == "video") {
						peers.set(call.peer, call);
						peerUsername = call.metadata.username;
						peerCamera = call.metadata.camera;
						peerMuted = call.metadata.muted;
						console.log("Incoming call from " + call.peer + " " + call.metadata.username)
						call.answer(stream)
					} else {
						shareCallsIn.set(call.peer, call);
						call.answer();
					}

					call.on('stream', userVideoStream => {
						// add incoming stream to grid
						if (streamType == "video") {
							addStream(call.peer, userVideoStream, peerUsername, peerCamera, peerMuted);
						} else {
							addShare(call.peer, userVideoStream);
						}
					})

					call.on('close', () => {
						if (streamType == "video") {
							endPeerCall(call.peer);
							removeStream(call.peer);
						} else {
							endShareCallIn(call.peer);
							removeShare(call.peer);
						}
					})
				
				})

				videos.set('me', {id: 'me', username: username, videoSource: stream, myMute: muted, muted: true, mirror: true, camera: camera, mine: true});
				videos = videos;

				superGrid = videos.get('me')

				function toggleCam() {
					stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
					camera = stream.getVideoTracks()[0].enabled;
					cameraChange('me', camera);
					socket.emit('camera-change-client', roomName, myId, camera);
					superGrid = superGrid;
				}

				function toggleMute() {
					stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
					muted = !stream.getAudioTracks()[0].enabled;
					muteChange('me', muted);
					socket.emit('mute-change-client', roomName, myId, muted);
					superGrid = superGrid;
				}

				document.getElementById('camToggle').onclick = toggleCam;				
				document.getElementById('toggleMute').onclick = toggleMute;

				
				// user connects, transmit call to them
				socket.on('user-connected', (userId, peerUsername, peerCamera, peerMuted) => {
					newUserCall(userId, stream, peerUsername, peerCamera, peerMuted);
					if (screenshare) {
						newUserScreenshare(userId, screenshareStream);
					}
				})
				
				// on disconnect, close call
				socket.on('user-disconnected', userId => {
					endPeerCall(userId);
					endShareCallIn(userId);
					endShareCallOut(userId);
					removeStream(userId);
					removeShare(userId);
				})

				socket.on('camera-change', (userId, camState) => {
					cameraChange(userId, camState);
				});

				socket.on('mute-change', (userId, muteState) => {
					muteChange(userId, muteState);
				});

				socket.on('user-ended-screenshare', userId => {
					removeShare(userId);
					endShareCallIn(userId);
				})
			})

			// screenshare
			function screenShare () {

				// get user screen
				if (screenshare) {
					screenshare = false;
					screenshareStream = null;
					screenshareTracks.stop();
					screenshareTracks.dispatchEvent(new Event("ended"));
				} else {
					navigator.mediaDevices.getDisplayMedia({
						video: true,
						audio: true
					}).then(stream => {
						screenshare = true;
						screenshareTracks = stream.getVideoTracks()[0];
						screenshareStream = stream;
						stream.getVideoTracks()[0].addEventListener('ended', () => {
							let tracks = stream.getTracks();
							removeShare('me');
							for (var i = 0; i < tracks.length; i++) {
								tracks[i].stop();
							}
							for (let [key, val] of shareCallsOut) {
								endShareCallOut(key);
							}
							socket.emit('stop-screenshare', roomName, myId);
							screenshare = false;
						});

						socket.emit('request-participants', roomName);

						addShare("me", stream);
					})
				}
			}

			socket.on('participants', users => {
				if (screenshare) {
					for (var key in users) {
						let user = users[key];
						if (user != myId && !shareCallsOut.has(user)) {
							newUserScreenshare(user, screenshareStream);
						}
					}
				}
			})


			document.getElementById('share').onclick = screenShare;


			// add stream to video grid
			function cameraChange (userId, camState) {
				let temp = videos.get(userId);
				temp.camera = camState;
				videos.set(userId, temp);
				videos = videos;
			}

			function muteChange (userId, muteState) {
				let temp = videos.get(userId);
				temp.myMute = muteState;
				videos.set(userId, temp);
				videos = videos;
			}

			function addStream (userId, stream, peerUsername, peerCamera, peerMuted) {
				videos.set(userId, {id: userId, videoSource: stream, camera: peerCamera, muted: false, mirror: false, username: peerUsername, myMute: peerMuted});
				videos = videos;
			}

			function removeStream (userId) {
				videos.delete(userId);
				videos = videos;
			}

			// add share to video grid
			function addShare (userId, stream) {
				sharesIn.set(userId, {id: userId, videoSource: stream, camera: true, muted: false, mirror: false});
				sharesIn = sharesIn;
			}

			function removeShare (userId) {
				sharesIn.delete(userId);
				sharesIn = sharesIn;
			}

			function newUserCall (userId, stream, peerUsername, peerCamera, peerMuted) {
				let options = {metadata: {"type": "video", "username": username, "camera": camera, "muted": muted}};
				const call = peer.call(userId, stream, options);
				console.log("Outgoing call to " + userId + " " + peerUsername);

				peers.set(userId, call);

				call.on('stream', userStream => {
					addStream(userId, userStream, peerUsername, peerCamera, peerMuted);
				})
				
				// remove video on close
				call.on('close', () => {
					removeStream(userId);
					endPeerCall(userId);
				})
			}

			function endPeerCall (userId) {
				if (peers.has(userId)) {
					peers.get(userId).close();
					peers.delete(userId);
				}
			}

			function endShareCallIn (userId) {
				if (shareCallsIn.has(userId)) {
					shareCallsIn.get(userId).close();
					shareCallsIn.delete(userId);
				}
			}

			function endShareCallOut (userId) {
				if (shareCallsOut.has(userId)) {
					shareCallsOut.get(userId).close();
					shareCallsOut.delete(userId);
				}
			}

			function newUserScreenshare (userId, stream) {
				let options = {metadata: {"type": "screenshare"}};
				const call = peer.call(userId, stream, options);
				// set call
				shareCallsOut.set(userId, call);
				// remove video on close
				call.on('close', () => {
					endShareCallOut(userId);
				})
			}



		})

	});

	function featureScreen(userId) {
		superGrid = videos.get(userId);
		superGrid = superGrid;
	}

	function featureShare(userId) {
		superGrid = sharesIn.get(userId);
		superGrid = superGrid;
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<main class="flex bg-gray-900 w-full h-screen align-items justify-center">

	
	<div class="flex-auto max-h-screen w-3/4 pb-5">
		<div class="grid grid-cols-5 h-2/3">
			<div class = "flex flex-col">
				<div id="video-grid" class="basis-0 grow overflow-y-auto">
					{#each [...videos] as [key,value]}
						{#key value.id}
							<div class="h-1/4" on:click={featureScreen(value.id)}>
								<svelte:component  this={Box} videoSource={value.videoSource} camera={value.camera} myMute = {value.myMute} muted={value.muted} mirror={value.mirror} username = {value.username} mine = {value.mine} />
							</div>
						{/key}
					{/each}
					{#each [...sharesIn] as [key,value]}
						{#key value.id}
							<div class="h-1/4" on:click={featureShare(value.id)}>
								<svelte:component this={Box} videoSource={value.videoSource} camera={value.camera} myMute = {value.myMute} muted={value.muted} mirror={value.mirror} username = {value.username} mine = {value.mine} />
							</div>
						{/key}
					{/each}
				</div>
			</div>
			
			<div id="super-grid" class="col-span-4 h-full w-full">
				{#key superGrid.id}
					<svelte:component this={Box} videoSource={superGrid.videoSource} camera={superGrid.camera} myMute = {superGrid.myMute} muted={superGrid.muted} mirror={superGrid.mirror} username = {superGrid.username} mine = {superGrid.mine} />
				{/key}
			</div>
		</div>



		<div class="flipVid"></div>

	</div>

	<div class="flex flex-box fixed bottom-0 w-full bg-blue-950 py-5 align-items justify-center">
		
		<button id="camToggle" class={camera ? "bg-blue-500 hover:bg-blue-700 text-white font-bold h-16 w-16 m-2 rounded-full" : "bg-red-500 hover:bg-red-700 text-white font-bold h-16 w-16 m-2 rounded-full"}><i class={camera ? "fa-solid fa-xl fa-video" : "fa-solid fa-xl fa-video-slash"}></i>
		</button>
		<button id="toggleMute" class={muted ? "bg-red-500 hover:bg-redasdfsf-700 text-white font-bold h-16 w-16 m-2 rounded-full" : "bg-blue-500 hover:bg-blue-700 text-white font-bold h-16 w-16 m-2 rounded-full"}><i class={muted ? "fa-solid fa-xl fa-microphone-slash" : "fa-solid fa-xl fa-microphone"}></i>
		</button>
		<button id="share" class={screenshare ? "bg-red-500 hover:bg-redasdfsf-700 text-white font-bold h-16 w-16 m-2 rounded-full" : "bg-blue-500 hover:bg-blue-700 text-white font-bold h-16 w-16 m-2 rounded-full"}><i class="fa-solid fa-xl fa-desktop"></i></button>

	</div>


</main>

