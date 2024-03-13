<script lang="ts">
    import { onMount } from 'svelte';
	import '@fortawesome/fontawesome-free/css/all.min.css'
    import { asDraggable } from 'svelte-drag-and-drop-actions'

    // export let boxSettings = {};
    // let videoSource = boxSettings.videoSource;
    // let muted = boxSettings.muted;
    // let mirror = boxSettings.mirror;
    // let camera = boxSettings.camera;
    // let username = boxSettings.username;

    export let videoSource;
    export let muted;
    export let mirror;
    export let camera;
    export let username;
    export let mine;
    export let myMute;
    let left = 0;
    let top = 0;
    let height = 300;
    let width = 400;
    let moving = false;

    function startResizing ()       { return { x:width,y:height } }
    function continueResizing (x,y) { width = x; height = y }
    function finishResizing (x,y)   { width = x; height = y }

    function onMouseDown() {
        console.log("dsadfds");
		moving = true;
	}
	
	function onMouseMove(e) {

		if (moving) {
            console.log(left);
			left += e.movementX;
			top += e.movementY;
		}
	}
	
	function onMouseUp() {
        console.log("olel")
		moving = false;
	}

    let videoID = "video-" + Math.random().toString(16).slice(2);
    let camCID = "cam-container-" + Math.random().toString(16).slice(2);
    let cardCID = "card-container-" + Math.random().toString(16).slice(2);
    onMount(() => {

        let camContainer = document.getElementById(camCID);
        let cardContainer = document.getElementById(cardCID);

        let video = document.getElementById(videoID);
        if (mirror) {
            video.classList.add("-scale-x-100");
        }
        video.srcObject = videoSource;
        video.muted = muted;
        video.addEventListener('loadedmetadata', () => {
			video.play()
		})
    })



</script>

<style>
    .sven {
        position: static;
    }

    .Note-ResizeHandle {
    display:block; position:absolute;
    right:0px; bottom:0px; width:32px; height:32px;
    background-color:transparent;
    background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAiklEQVRYR+WUwQ3AIAwDm3UzUNZtxQ8hhBpIbGhZIKezsVzkJ4z7ZnaXu6oq/wSorVMMwAHqzNvOQQzQAUY/DWIADjBSXmDSd4AO4FnXb3TAozxlB+gAnsxTDMABVpSH7AAdYEX5mR2IVD5lgA4QmfmUAThApvJXO0AHyFS+ZweQyrsG6ADIzNtbD4OSoCHdTWtaAAAAAElFTkSuQmCC");
    cursor:nwse-resize;
  }
</style>
<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

    <div class="border-2" style="position:fixed; top:{top}px; left: {left}px; height: {height}px; width: {width}px;" on:mousedown={onMouseDown}>
        <div id={camCID} class={camera ? "h-full w-full" : "hidden"}>
            <video id={videoID} class = "h-full w-full"></video>
        </div>

        <div id={cardCID} class={!camera ? "flex flex-box h-full w-full bg-blue-950 items-center justify-center text-white text-3xl" : "hidden"}>
            {username}
        </div>
        <i class={myMute ? "absolute bottom-5 right-2 fa-solid fa-xl fa-microphone-slash text-red-500" : ""}></i>
        <div class="Note-ResizeHandle" use:asDraggable={{
            onDragStart:startResizing, onDragMove:continueResizing, onDragEnd:finishResizing,
            minX:120,minY:80, maxX:5000,maxY:5000
          }}></div>

    </div>
