<script lang='ts'>
	import { onMount } from 'svelte';
	import { io } from 'socket.io-client'
	import { v4 } from 'uuid';
	/** @type {import('./$types').LayoutData} */


	export let data;
    let roomName = data.name;
	const peers = {};
	const videos = {};
	const shares = {};
	const sharecalls = {};
	var muted = false;

	onMount(() => {

		
		const socket = io("http://localhost:3000");

		const videoGrid = document.getElementById('video-grid');
		const superVid = document.getElementById('super-video');

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
				addStream(video, stream);

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
						videos[call.peer] = video;
						call.answer(stream)
					} else {
						shares[call.peer] = video;
						call.answer();
					}

					call.on('close', () => {
						video.remove()
						console.log('close from other end')
					})

					call.on('stream', userVideoStream => {
						// add incoming stream to grid
						addStream(video, userVideoStream);
						console.log('peer joined');
					})
				
				})
				
				// user connects, transmit call to them
				socket.on('user-connected', userId => {
					console.log(userId + " peer");
					newUserCall(userId, stream);
				})
				
				// on disconnect, close call
				socket.on('user-disconnected', userId => {
					if (peers[userId]) peers[userId].close()
					if (sharecalls[userId]) sharecalls[userId].close()
					if (videos[userId]) {
						videos[userId].remove();
						videos[userId] = null;
					}
					if (shares[userId]) {
						shares[userId].remove();
						shares[userId] = null;
					}
				})
			})

			// screenshare
			function screenShare () {
				// get user screen

				navigator.mediaDevices.getDisplayMedia({
					video: true,
					audio: true
				}).then(stream => {
					console.log('testing')
					socket.emit('request-participants', roomName);
					// get user screen, add to grid
					const video = document.createElement("video");
					video.muted = true;
					addStream(video, stream);

					// // call
					// peer.on('call', call => {
					// 	// answer
					// 	console.log(call);
					// 	call.answer(stream)
					
					// 	const video = document.createElement("video");
					// 	let streamType = call.metadata.type;
					// 	if (streamType == "video") {
					// 		videos[call.peer] = video;
					// 	} else {
					// 		shares[call.peer] = video;
					// 	}

					// 	call.on('close', () => {
					// 		video.remove()
					// 		console.log('close from other end')
					// 	})
					// 	call.on('stream', userVideoStream => {
					// 		// add incoming stream to grid
					// 		addStream(video, userVideoStream);
					// 		console.log('peer joined');
					// 	})
					
					// })

					
					socket.on('user-connected', userId => {
						console.log(userId + " peer share");
						newUserScreenshare(userId, stream);
					})

					socket.on('participants', users => {
						console.log(users);
						for (var key in users) {
							let user = users[key];
							if (user != myId) {
								console.log(user);
								newUserScreenshare(user, stream);
							}
						}
					})
				})
			}
			
			document.getElementById('share').onclick = screenShare;


			// add stream to video grid
			function addStream (video, stream) {
				document.getElementById('share').onclick = screenShare;
				video.srcObject = stream
				video.classList.add("flex");
				video.classList.add("border-2");
				video.classList.add("w-full");
				video.classList.add("h-full");
				video.onclick = function() {
					superVid.srcObject = stream;
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
				peers[userId] = call;
				videos[userId] = video;
			}

			function newUserScreenshare (userId, stream) {
				let options = {metadata: {"type": "screenshare"}};
				const call = peer.call(userId, stream, options);
				const video = document.createElement("video");

				call.on('stream', userStream => {
					addStream(video, userStream);
				})
				
				// remove video on close
				call.on('close', () => {
					video.remove()
					shares[userId] = null;
					console.log('share close from your end')
				})
				
				// set call
				sharecalls[userId] = call;
				shares[userId] = video;
			}

		})

	});

</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<main class="bg-gray-900 w-full min-h-screen">
	<h1 class="p-5 text-white">Welcome to Room {roomName}!</h1>
  
	<div class="p-10 flex flex-col items-center">
		<div>
			<button id="camToggle" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Toggle Camera</button>
			<button id="toggleMute" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">{muted ? "Unmute" : "Mute"}</button>
			<button id="share" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Screenshare</button>
		</div>

		<div id="video-grid" class="grid grid-cols-4">

		</div>

		<div id="super-grid" class="h-full w-full">
			<video autoplay id="super-video" class="border-2 w-full h-full flex"></video>
		</div>


	</div>


</main>

<style>


  
  </style>