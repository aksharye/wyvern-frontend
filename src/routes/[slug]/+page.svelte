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
	var username = "";

	let boxes = [];

	onMount(() => {

		username = prompt("Enter username:", "");
		console.log(username);
		const socket = io("https://fluorescent-profuse-acorn.glitch.me");
		// const socket = io("http://localhost:3000");

		const videoGrid = document.getElementById('video-grid');
		const superVid = document.getElementById('super-video');
		
		superVid.muted = true;
	

		socket.on("connect", () => {
			console.log("Successfully connected to socket");
		});

		var myId = "";
		
		import("peerjs").then(({ default: Peer }) => {
			const peer = new Peer();

			peer.on('open', id => {
				// emit join room upon open
				myId = id;
				socket.emit('join-room', roomName, id)
				console.log("user joined " + id);
			})
			
			// get user camera
			navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			}).then(stream => {
				superVid.srcObject = stream;

				videos.set('me', {videoSource: stream, muted: true, mirror: true, camera: camera});
				videos = videos;
				
				superVid.srcObject = stream;
				superVid.classList.add("-scale-x-100")

				function toggleCam() {
					stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
					camera = stream.getVideoTracks()[0].enabled;
					let temp = videos.get('me');
					temp.camera = camera;
					videos.set('me', temp);
					videos = videos;
				}

				function toggleMute() {
					stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
					muted = !stream.getAudioTracks()[0].enabled;
				}

				document.getElementById('camToggle').onclick = toggleCam;				
				document.getElementById('toggleMute').onclick = toggleMute;
				// call
				peer.on('call', call => {
					// answer
					let streamType = call.metadata.type;
					if (streamType == "video") {
						peers.set(call.peer, call);
						call.answer(stream)
					} else {
						shareCallsIn.set(call.peer, call);
						call.answer();
					}

					call.on('stream', userVideoStream => {
						// add incoming stream to grid
						if (streamType == "video") {
							addStream(call.peer, userVideoStream);
						} else {
							addShare(call.peer, userVideoStream);
						}
						console.log(call.peer + " stream");
					})

					call.on('close', () => {
						if (streamType == "video") {
							endPeerCall(call.peer);
							removeStream(call.peer);
						} else {
							endShareCallIn(call.peer);
							removeShare(call.peer);
						}
						console.log(call.peer + " close");
					})

					call.on('stream', userVideoStream => {
						// add incoming stream to grid
						if (streamType == "video") {
							addStream(call.peer, userVideoStream);
						} else {
							addShare(call.peer, userVideoStream);
						}
					})
				
				})
				
				// user connects, transmit call to them
				socket.on('user-connected', userId => {
					newUserCall(userId, stream);
				})
				
				// on disconnect, close call
				socket.on('user-disconnected', userId => {
					endPeerCall(userId);
					endShareCallIn(userId);
					endShareCallOut(userId);
					removeStream(userId);
					removeShare(userId);
				})

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
					screenshareTracks.stop();
					screenshareTracks.dispatchEvent(new Event("ended"));
				} else {
					navigator.mediaDevices.getDisplayMedia({
						video: true,
						audio: true
					}).then(stream => {
						screenshare = true;
						screenshareTracks = stream.getVideoTracks()[0];

						stream.getVideoTracks()[0].addEventListener('ended', () => {
							console.log('ended');
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
						socket.on('participants', users => {

							for (var key in users) {
								let user = users[key];
								console.log(user);
								console.log(shareCallsOut.has(user));
								if (user != myId && !shareCallsOut.has(user)) {
									newUserScreenshare(user, stream);
								}
							}
						})
						addShare("me", stream);
						
						socket.on('user-connected', userId => {
							newUserScreenshare(userId, stream);
						})


					})
				}
			}
			
			document.getElementById('share').onclick = screenShare;


			// add stream to video grid
			function addStream (userId, stream) {
				videos.set(userId, {videoSource: stream, camera: true, muted: false, mirror: false});
				videos = videos;
			}

			function removeStream (userId) {
				videos.delete(userId);
				videos = videos;
			}

			// add share to video grid
			function addShare (userId, stream) {
				sharesIn.set(userId, {videoSource: stream, camera: true, muted: false, mirror: false});
				sharesIn = sharesIn;
			}

			function removeShare (userId) {
				sharesIn.delete(userId);
				sharesIn = sharesIn;
			}

			function newUserCall (userId, stream) {
				let options = {metadata: {"type": "video"}};
				const call = peer.call(userId, stream, options);

				peers.set(userId, call);

				call.on('stream', userStream => {
					addStream(userId, userStream);
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
						{#key value.camera}
							<svelte:component this={Box} bind:boxSettings={value}/>
						{/key}
					{/each}
					{#each [...sharesIn] as [key,value]}
						<svelte:component this={Box} bind:boxSettings={value}/>
					{/each}
				</div>
			</div>
			
			<div id="super-grid" class="col-span-4 h-full">
				<video autoplay id="super-video" class="top-0 w-full h-full"></video>
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

