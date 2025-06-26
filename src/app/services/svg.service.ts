import { Injectable } from '@angular/core';

declare var OpenSeadragon: any; // Declare OpenSeadragon globally

@Injectable({
  providedIn: 'root'
})
export class SvgService {

  constructor() { }


  dumpViewerIntializer() {
    const viewerDOM = document.getElementById('imageContainer');
    console.log('viewerDOM', viewerDOM);
    if (!viewerDOM) {
      throw new Error(' element "stainingImageContainer" not found')
    }

    const duomo = {
      Image: {
        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
        Url: "//openseadragon.github.io/example-images/duomo/duomo_files/",
        Format: "jpg",
        Overlap: "2",
        TileSize: "256",
        Size: {
          Width: "13920",
          Height: "10200"
        }
      }
    };

    let _prefixUrl = "//openseadragon.github.io/openseadragon/images/"
    let openseadragonViewer = {}

    try {
      openseadragonViewer = OpenSeadragon({
        id: 'viewerContainer',
        prefixUrl: "//openseadragon.github.io/openseadragon/images/",
        tileSources: duomo,
        showNavigator: true,
        toolbar: 'viewer-Container',
        navigatorPosition: 'ABSOLUTE',
        navigatorTop: '30px',
        navigatorRight: '60px',
        navigatorHeight: '120px',
        navigatorWidth: '145px',
        navigatorBorderColor: '#00426A',
        navigatorBorderRadius: '5px',
        navigatorBorder: '1px',
        navigatorDisplayRegionColor: 'yellow',
        showNavigationControl: false,
        showRotationControl: false,
        zoomInButton: 'zoomInBtn',
        zoomOutButton: 'zoomOutBtn',
        rotateLeftButton: 'rotateLeftBtn',
        rotateRightButton: 'rotateRightBtn',
        homeButton: 'rotateBtn',
        fullPageButton: 'fullScreenBtn',
        showZoomControl: false,
        minZoomLevel: 0.9,
        defaultZoomLevel: 0.9,
        touchEnabled: true,
        mouseEnabled: true,
        blendTime: 0,
        animationTime: 0,
        immediateRender: true,
        gestureSettingsTouch: {
          clickToZoom: false,
          scrollToZoom: false,
          pinchToZoom: true,
          flickEnabled: false
        },

      })

    } catch (error) {
    };
    // this.OsdViewer = openseadragonViewer;
    return openseadragonViewer;

  }
}
