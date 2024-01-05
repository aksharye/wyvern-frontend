<script lang="ts">
    import { onMount } from 'svelte';

    export let boxSettings = {};
    let videoSource = boxSettings.videoSource;
    let muted = boxSettings.muted;
    let mirror = boxSettings.mirror;
    let camera = boxSettings.camera;

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

<div class="block h-1/4">
    <div id={camCID} class={camera ? "h-full w-full" : "hidden"}>
        <video id={videoID} class = "h-full w-full"></video>
    </div>
    <div id={cardCID} class={!camera ? "flex flex-box h-full w-full bg-blue-950 items-center justify-center text-white text-3xl" : "hidden"}>
        LAWL
    </div>
</div>



<style>
</style>
