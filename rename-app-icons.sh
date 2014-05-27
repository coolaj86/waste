#!/bin/bash
ICONDIR="${HOME}/Downloads/App Icon";
IMGDIR="./app/images"
mv "${ICONDIR}/iPhone.png"     "${IMGDIR}/apple-touch-icon.png";
mv "${ICONDIR}/iPad.png"       "${IMGDIR}/apple-touch-icon-76x76.png";
mv "${ICONDIR}/iPhone@2x.png"  "${IMGDIR}/apple-touch-icon-120x120.png";
mv "${ICONDIR}/iPad@2x.png"    "${IMGDIR}/apple-touch-icon-152x152.png";

STARTUPDIR="${HOME}/Downloads/images"
IMGDIR="./app/images"
mv "${STARTUPDIR}/320x480.png"     "${IMGDIR}/apple-touch-startup.png";
mv "${STARTUPDIR}/640x960.png"       "${IMGDIR}/apple-touch-startup@2x.png";
mv "${STARTUPDIR}/640x1136.png"  "${IMGDIR}/apple-touch-startup-large@2x.png";
