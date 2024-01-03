<style>

</style>

<script lang='ts'>
	import { onMount } from 'svelte';
	import { io } from 'socket.io-client'
	import { v4 } from 'uuid';
	/** @type {import('./$types').LayoutData} */


	export let data;
    let roomName = data.name;

	const peers = {};
	const videos = {};

	const sharesIn = {};
	const shareCallsOut = {};
	const shareCallsIn = {};

	var camera = false;
	var muted = false;
	var screenshare = false;
	var screenshareTracks = null;
	var myShare = null;

	onMount(() => {

		
		// const socket = io("https://fluorescent-profuse-acorn.glitch.me");
		const socket = io("http://localhost:3000");

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
				
				// create video object, add to stream
				const video = document.createElement("video");
				video.muted = true;
				superVid.srcObject = stream;
				superVid.classList.add("-scale-x-100")
				addStream(video, stream, true);


				function toggleCam() {
					stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
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
					console.log(call);
				
					const video = document.createElement("video");
					let streamType = call.metadata.type;
					if (streamType == "video") {
						peers[call.peer] = call;
						videos[call.peer] = video;
						call.answer(stream)
					} else {
						shareCallsIn[call.peer] = call;
						sharesIn[call.peer] = video;
						call.answer();
					}

					call.on('close', () => {
						video.remove()
						if (streamType == "video") {
							if (peers[call.peer]) {
								peers[call.peer].close()
								peers[call.peer] = null;
							}
						} else {
							if (shareCallsIn[call.peer]) {
								shareCallsIn[call.peer].close()
								shareCallsIn[call.peer] = null;
							}
						}


						console.log('close from other end')
					})

					call.on('stream', userVideoStream => {
						// add incoming stream to grid
						addStream(video, userVideoStream);
						console.log('peer joined ' + call.peer + ' ' + call.metadata.type);
					})
				
				})
				
				// user connects, transmit call to them
				socket.on('user-connected', userId => {
					console.log(userId + " peer");
					newUserCall(userId, stream);
				})
				
				// on disconnect, close call
				socket.on('user-disconnected', userId => {
					console.log("can");
					console.log(peers[userId])
					if (peers[userId]) {
						peers[userId].close()
						peers[userId] = null;
					}
					if (shareCallsOut[userId]) {
						shareCallsOut[userId].close()
						shareCallsOut[userId] = nul;
					}

					if (shareCallsIn[userId]) {
						shareCallsIn[userId].close()
						shareCallsIn[userId] = null;
					}

					if (videos[userId]) {
						videos[userId].remove();
						videos[userId] = null;
					}
					if (sharesIn[userId]) {
						sharesIn[userId].remove();
						sharesIn[userId] = null;
					}

				})

				socket.on('user-ended-screenshare', userId => {
					if (sharesIn[userId]) {
						sharesIn[userId].remove();
						sharesIn[userId] = null;
					}

					if (shareCallsIn[userId]) {
						shareCallsIn[userId].close()
						shareCallsIn[userId] = null;
					}
				})
			})

			// screenshare
			function screenShare () {
				// get user screen
				
				if (screenshare) {
					screenshare = false;
					screenshareTracks[0].stop();
					screenshareTracks[0].dispatchEvent(new Event("ended"));
					screenshareTracks[1].stop();
				} else {

					navigator.mediaDevices.getDisplayMedia({
						video: true,
						audio: true
					}).then(stream => {
						screenshare = true;
						screenshareTracks = [stream.getVideoTracks()[0], stream.getAudioTracks()[0]];
						console.log('testing')
						socket.emit('request-participants', roomName);
							// get user screen, add to grid
							const video = document.createElement("video");
							video.muted = true;
							myShare = video;
							addStream(video, stream);
							
							socket.on('user-connected', userId => {
								if (screenshare) {
									console.log(userId + " peer share");
									newUserScreenshare(userId, stream);
								}

							})

							socket.on('participants', users => {
								console.log(users);
								if (screenshare) {
									for (var key in users) {
										let user = users[key];
										if (user != myId && shareCallsOut[user] == null) {
											console.log(user);
											newUserScreenshare(user, stream);
										}
									}
								}

							})

							stream.getVideoTracks()[0].onended = function () {

								socket.emit('stop-screenshare', roomName, myId);
								screenshare = false;
								video.remove();

								for (var key in shareCallsOut) {
									shareCallsOut[key].close();
									shareCallsOut[key] = null;
								}
							};
						})
				}


			}
			
			document.getElementById('share').onclick = screenShare;


			// add stream to video grid
			function addStream (video, stream, mine=false) {

				video.srcObject = stream
				video.classList.add("flex");
				video.classList.add("border-2");
				video.classList.add("w-full");
				video.classList.add("mx-auto");

				if (mine) {
					video.classList.add("-scale-x-100");
				}


				video.onclick = function() {

					superVid.srcObject = stream;
	
					if (mine) {
						superVid.classList.add("-scale-x-100");
					} else {
						superVid.classList.remove("-scale-x-100");
					}
				}
				video.addEventListener('loadedmetadata', () => {
					video.play()
				})
				videoGrid.append(video);
			}

			function newUserCall (userId, stream) {
				let options = {metadata: {"type": "video"}};
				const call = peer.call(userId, stream, options);
				const video = document.createElement("video");

				peers[userId] = call;
				videos[userId] = video;

				call.on('stream', userStream => {
					addStream(video, userStream);
				})
				
				// remove video on close
				call.on('close', () => {
					video.remove()
					videos[userId] = null;
					console.log('close from your end')
				})
				
				// set call

			}

			function newUserScreenshare (userId, stream) {
				let options = {metadata: {"type": "screenshare"}};
				const call = peer.call(userId, stream, options);

				
				// remove video on close
				call.on('close', () => {
					shareCallsOut[userId].close();
					shareCallsOut[userId] = null;
					console.log('share close from your end')
				})
				
				// set call
				shareCallsOut[userId] = call;
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
					<!-- Your content goes here -->
				</div>
			</div>
			
			<div id="super-grid" class="col-span-4 h-full">
				<video autoplay id="super-video" class=" w-full h-full"></video>
			</div>
		</div>



		<div class="flipVid"></div>

	</div>

	<div class="flex flex-box fixed bottom-0 w-full bg-blue-950 py-5 align-items justify-center">
		
		<button id="camToggle" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Toggle Camera</button>
		<button id="toggleMute" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">{muted ? "Unmute" : "Mute"}</button>
		<button id="share" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">{screenshare ? "Stop Screenshare" : "Screenshare"}</button>

	</div>


</main>

