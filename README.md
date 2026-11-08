# YouTube Play Assist

A Chrome extension that adds playback controls to YouTube’s standard control bar, alongside the play button, volume, and playback time. The added controls appear and hide with YouTube’s controls.

## Features

- Change playback speed from 0.25× to 4×.
- Rewind or skip forward by 10 seconds.
- Repeat any section of a video with A–B looping.

## Usage

Choose a speed from the speed menu, or use the rewind and forward buttons to seek by 10 seconds. Seeking disables A–B looping.

Click **A↔B** to open loop settings. Enter start and end times, or click **Use current time** for each endpoint, then click **Enable loop**. Times accept seconds, `m:ss`, or `h:mm:ss`, including fractional seconds. The current-time buttons round down to whole seconds.

Close settings with **×**, Escape, another click on **A↔B**, or a click outside the settings. Looping continues when settings are closed; **A↔B** turns green while a loop is active. Click **Disable loop** or **Disable** to stop looping.

## Supported pages and limitations

Supports regular video pages (`https://www.youtube.com/watch?v=...`), including fullscreen playback. Shorts, embedded players, and live-stream looping are not supported. Avoid using the controls during ads. Looping uses browser events and timers, so a small delay at the loop endpoint is possible.

The extension does not collect data or send data to external services.

## Checks

Run `node --test tests/*.test.cjs` to test time parsing and loop-range validation.
