<script lang="ts">
    import { onMount } from 'svelte';
	import '@fortawesome/fontawesome-free/css/all.min.css'

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

<div class="relative h-full w-full">
    <div id={camCID} class={camera ? "h-full w-full" : "hidden"}>
        <video id={videoID} class = "h-full w-full"></video>
    </div>

    <div id={cardCID} class={!camera ? "flex flex-box h-full w-full bg-blue-950 items-center justify-center text-white text-3xl" : "hidden"}>
        {username}
    </div>
    <i class={myMute ? "absolute bottom-5 right-2 fa-solid fa-xl fa-microphone-slash text-red-500" : ""}></i>


</div>



<style>
</style>
