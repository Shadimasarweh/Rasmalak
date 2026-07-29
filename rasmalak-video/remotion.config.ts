import { Config } from '@remotion/cli/config';

// Rasmalak lesson videos: 1080p H.264, overwrite prior renders.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

export {};
