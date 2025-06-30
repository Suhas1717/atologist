import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { SvgService } from '../services/svg.service';
import { Subscription } from 'rxjs';

declare var OpenSeadragon: any;

@Component({
  selector: 'app-image-annotator',
  templateUrl: './image-annotator.component.html',
  styleUrls: ['./image-annotator.component.scss']
})
export class ImageAnnotatorComponent implements AfterViewInit, OnInit, OnDestroy {

  @ViewChild('viewerContainer') viewerContainer!: ElementRef;
  @ViewChild('annotationLayer') annotationLayer!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('annotationCanvas') annotationCanvas!: ElementRef<HTMLCanvasElement>;

  viewer: any;
  isDrawing = false;
  startX = 0;
  startY = 0;
  color = '#FF0000';
  strokeWidth = 2;
  annotations: any[] = [];
  tempAnnotation: any = null;
  imageUrl: string | null = null;
  imageWidth = 0;
  imageHeight = 0;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  lastTouchDistance = 0;
  isPanning = false;
  panStartPoint: null = null;

  annotationText = '';
  annotationBoxVisibility = false;
  currentAnnotation: {
    id: string;
    text: string;
    action: 'add' | 'update' | 'delete';
  } = {
      id: '',
      text: '',
      action: 'add'
    };
  shape: any;
  currentTool = 'hand';
  viewerEventsSubscription: Subscription | undefined

  constructor(private svgService: SvgService, private cdr: ChangeDetectorRef) {
  }
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);

    if (this.viewerEventsSubscription) {
      this.viewerEventsSubscription.unsubscribe();
      this.viewerEventsSubscription = undefined;
    }
    // Clean up OpenSeadragon viewer if needed
    if (this.viewer && typeof this.viewer.destroy === 'function') {
      this.viewer.destroy();
      this.viewer = null;
    }


  }


  ngOnInit(): void {
    // this.initializeViewer();
  }

  ngAfterViewInit() {
    if (!this.viewerContainer?.nativeElement) {
      console.error('Viewer container not found!');
      return;
    }
    this.initializeViewer();
    this.setupSVGLayer();

    document.addEventListener('click', this.handleDocumentClick);

    // this.setupContainer();

  }

  initializeViewer() {

    const demo = {
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
    this.viewer = OpenSeadragon({
      id: 'viewerContainer',
      prefixUrl: "//openseadragon.github.io/openseadragon/images/",
      tileSources: demo,
      showNavigator: true,
      toolbar: 'viewerContainer',
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
      minZoomLevel: 1,
      defaultZoomLevel: 1,
      touchEnabled: true,
      mouseEnabled: true,
      blendTime: 0,
      animationTime: 0,
      immediateRender: true,
      constrainDuringPan: true,
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: false,    // Disable double-tap zoom
        pinchToZoom: true,        // Keep pinch-to-zoom if desired
        flickEnabled: false
      },
      gestureSettingsMouse: {
        clickToZoom: false,       // Disable single-click zoom
        dblClickToZoom: false,    // Disable double-click zoom
        pinchToZoom: false,
        flickEnabled: false
      },
      dblClickDistThreshold: 0,   // Disable double-click detection
      dblClickTimeThreshold: 0
    })

    // Wait for viewer to be ready before adding handlers
    this.viewer.addHandler('open', () => {
      this.viewer?.viewport.zoomTo(1, null, false);
      this.viewer?.viewport.applyConstraints();
      this.setupEventHandlers();
      this.updateAnnotationCanvasPosition();
      this.viewerEventsSubscription = this.viewer.annotations.observable.subscribe(
        (value: any) => {
          if (value.type === 'elementCreated') {
            setTimeout(() => {
              const shape = value.element;
              this.shape = shape;
              this.annotationBoxVisibility = true; // THIS LINE SHOWS THE POPUP
              this.currentAnnotation = {
                id: shape[1].id,
                text: '',
                action: 'add'
              };
              this.cdr.detectChanges(); // Add this line
            }, 100);
          }
        }
      );
    });
  }

  setupEventHandlers() {
    this.viewer.addHandler('update-viewport', () => {
      this.updateAnnotationCanvasPosition();
    });

    this.viewer.addHandler('resize', () => {
      this.updateAnnotationCanvasPosition();
    });
  }

  updateAnnotationLayerPosition() {
    const container = this.viewerContainer.nativeElement;
    const layer = this.annotationLayer.nativeElement;

    layer.style.position = 'absolute';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = container.offsetWidth + 'px';
    layer.style.height = container.offsetHeight + 'px';
  }

  getCoordinates(event: any): { x: number, y: number } {
    const rect = this.viewerContainer.nativeElement.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches) {
      clientX = event.touches[0]?.clientX;
      clientY = event.touches[0]?.clientY;
    }
    // console.log('Touch event detected', event.touches[0]);

    // console.log('Touch event detected', clientX, clientY);

    // Calculate coordinates relative to the container
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }


  updateAnnotationCanvasPosition() {
    // const canvas = this.annotationCanvas.nativeElement;
    const container = this.viewerContainer.nativeElement;

    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';

  }

  setupContainer() {
    // Initial setup if needed
    // Position annotation canvas over the viewer
    this.viewer.addHandler('update-viewport', () => {
      this.updateAnnotationCanvasPosition();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.updateAnnotationCanvasPosition();
    });
  }

  viewportToImageCoordinates(x: number, y: number) {
    const viewportPoint = new OpenSeadragon.Point(x, y);
    const imagePoint = this.viewer.viewport.viewportToImageCoordinates(
      this.viewer.viewport.windowToViewportCoordinates(viewportPoint)
    );
    return { x: imagePoint.x, y: imagePoint.y };
  }

  onPointerDown(event: MouseEvent | TouchEvent) {
    this.clearExistingTempShapes();
    const { x, y } = this.getCoordinates(event);
    const imagePoint = this.viewportToImageCoordinates(x, y);
    const constrainedPoint = this.constrainToImage(imagePoint.x, imagePoint.y);

    this.startX = constrainedPoint.x;
    this.startY = constrainedPoint.y;

    if (this.currentTool === 'hand') {
      this.isPanning = true;
      const { x, y } = this.getCoordinates(event);

      this.panStartPoint = this.viewer.viewport.pointFromPixel(new OpenSeadragon.Point(x, y));
      return; // Skip drawing logic for hand tool
    }

    event.preventDefault();

    const existingTemp = this.viewerContainer.nativeElement.querySelector('.annotation.temp');
    if (existingTemp) {
      existingTemp.remove();
    }

    // const { x, y } = this.getCoordinates(event);
    this.startX = x;
    this.startY = y;
    this.isDrawing = true;

    if (this.currentTool === 'line') {
      this.createLine(x, y);
    } else if (this.currentTool === 'rectangle') {
      this.createRectangle();
    } else if (this.currentTool === 'circle') {
      this.createCircle(x, y);
    } else if (this.currentTool === 'freehand') {
      this.createFreehandPath(x, y);
    }
  }

  onPointerUp(event: MouseEvent | TouchEvent) {
    if (this.currentTool === 'hand') {
      this.isPanning = false;
      this.panStartPoint = null;
      return;
    }

    if (!this.isDrawing) return;
    event.preventDefault();
    const { x, y } = this.getCoordinates(event);
    console.log('Pointer up at:', x, y);
    switch (this.currentTool) {
      case 'rectangle':
        this.finalizeRectangle();
        break;
      case 'circle':
        this.finalizeCircle();
        break;
      case 'line':
        this.finalizeLine();
        break;
      case 'freehand':
        this.finalizeFreehand();
        break;
    }

    this.isDrawing = false;
  }


  onPointerMove(event: MouseEvent | TouchEvent) {
    const { x, y } = this.getCoordinates(event);
    const imagePoint = this.viewportToImageCoordinates(x, y);
    const constrainedPoint = this.constrainToImage(imagePoint.x, imagePoint.y);

    if (this.currentTool === 'hand' && this.isPanning && this.panStartPoint) {
      const currentPoint = this.viewer.viewport.pointFromPixel(new OpenSeadragon.Point(x, y));
      const delta = currentPoint.minus(this.panStartPoint);
      this.viewer.viewport.panBy(delta);
      this.panStartPoint = currentPoint;
      return;
    }

    if (!this.isDrawing) return;
    event.preventDefault();

    if (event instanceof TouchEvent && event.touches.length === 2) {
      return;
    }

    if (!this.isDrawing) return;

    // const { x, y } = this.getCoordinates(event);

    switch (this.currentTool) {
      case 'rectangle':
        this.updateRectangle(x, y);
        break;
      case 'circle':
        this.updateCircle(x, y);
        break;
      case 'line':
        this.updateLine(x, y);
        break;
      case 'freehand':
        this.updateFreehand(x, y);
        break;
    }
  }

  lineStartPoint: any = null;
  // Add to ImageAnnotatorComponent class
  createLine(x: number, y: number): SVGLineElement {
    this.clearExistingTempShapes();

    const svg = this.viewerContainer.nativeElement.querySelector('.annotation-svg-layer');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    // Store in viewport coordinates
    this.lineStartPoint = new OpenSeadragon.Point(x, y);

    line.setAttribute('class', 'annotation line temp');
    line.setAttribute('stroke', this.color);
    line.setAttribute('stroke-width', this.strokeWidth.toString());
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.setAttribute('x1', x.toString());
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', x.toString());
    line.setAttribute('y2', y.toString());

    svg.appendChild(line);
    return line;
  }

  updateLine(x: number, y: number) {
    const line = this.viewerContainer.nativeElement.querySelector('.line.temp') as SVGLineElement;
    if (!line) return;

    // Update end point in viewport coordinates
    line.setAttribute('x2', x.toString());
    line.setAttribute('y2', y.toString());
  }

  finalizeLine() {
    const line = this.viewerContainer.nativeElement.querySelector('.line.temp') as SVGLineElement;
    if (!line) return;

    line.classList.remove('temp');

    // Convert to image coordinates for storage
    const startViewport = new OpenSeadragon.Point(
      parseFloat(line.getAttribute('x1')!),
      parseFloat(line.getAttribute('y1')!)
    );
    const endViewport = new OpenSeadragon.Point(
      parseFloat(line.getAttribute('x2')!),
      parseFloat(line.getAttribute('y2')!)
    );

    const startImage = this.viewer.viewport.viewportToImageCoordinates(
      this.viewer.viewport.windowToViewportCoordinates(startViewport)
    );
    const endImage = this.viewer.viewport.viewportToImageCoordinates(
      this.viewer.viewport.windowToViewportCoordinates(endViewport)
    );

    const annotation = {
      element: line,
      type: 'line',
      startX: startImage.x,
      startY: startImage.y,
      endX: endImage.x,
      endY: endImage.y,
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'line-' + Date.now()
    };

    this.annotations.push(annotation);
    this.completeDrawing(annotation);
  }

  // Add to ImageAnnotatorComponent class
  createFreehandPath(x: number, y: number): SVGPathElement {
    this.clearExistingTempShapes();

    const svg = this.viewerContainer.nativeElement.querySelector('.annotation-svg-layer');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    path.setAttribute('class', 'annotation freehand temp');
    path.setAttribute('stroke', this.color);
    path.setAttribute('stroke-width', this.strokeWidth.toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('d', `M ${x} ${y}`);

    svg.appendChild(path);
    return path;
  }

  updateFreehand(x: number, y: number) {
    const path = this.viewerContainer.nativeElement.querySelector('.freehand.temp') as SVGPathElement;
    if (!path) return;

    const currentD = path.getAttribute('d') || '';
    path.setAttribute('d', `${currentD} L ${x} ${y}`);
  }

  finalizeFreehand() {
    const path = this.viewerContainer.nativeElement.querySelector('.freehand.temp') as HTMLDivElement;
    if (!path) return;

    path.classList.remove('temp');

    // Safely parse points with error handling
    let points: { x: number, y: number }[] = [];
    try {
      points = JSON.parse(path.dataset['points'] || '[]');
    } catch (e) {
      console.error('Failed to parse freehand points', e);
      points = [];
    }

    const annotation = {
      element: path,
      type: 'freehand',
      points: points,
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'freehand-' + Date.now(),  // Add unique ID like other methods
      // Add bounding box for consistency
      x: points.length > 0 ? Math.min(...points.map(p => p.x)) : 0,
      y: points.length > 0 ? Math.min(...points.map(p => p.y)) : 0,
      width: points.length > 0 ? Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) : 0,
      height: points.length > 0 ? Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) : 0
    };

    this.annotations.push(annotation);
    this.completeDrawing(annotation);  // Trigger annotation input popup
  }

  // Shape creation methods
  createRectangle(): SVGRectElement {
    this.clearExistingTempShapes();

    const svg = this.viewerContainer.nativeElement.querySelector('.annotation-svg-layer');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    rect.setAttribute('class', 'annotation rectangle temp');
    rect.setAttribute('stroke', this.color);
    rect.setAttribute('stroke-width', this.strokeWidth.toString());
    rect.setAttribute('fill', 'none');
    rect.setAttribute('x', this.startX.toString());
    rect.setAttribute('y', this.startY.toString());
    rect.setAttribute('width', '0');
    rect.setAttribute('height', '0');
    rect.setAttribute('vector-effect', 'non-scaling-stroke');

    svg.appendChild(rect);
    return rect;
  }

  updateRectangle(x: number, y: number) {
    const constrainedEnd = this.constrainToImage(x, y);
    const constrainedStart = this.constrainToImage(this.startX, this.startY);

    const width = constrainedEnd.x - constrainedStart.x;
    const height = constrainedEnd.y - constrainedStart.y;

    const rect = this.viewerContainer.nativeElement.querySelector('.rectangle.temp') as SVGRectElement;
    if (!rect) return;

    rect.setAttribute('width', Math.abs(width).toString());
    rect.setAttribute('height', Math.abs(height).toString());
    rect.setAttribute('x', (width > 0 ? constrainedStart.x : constrainedEnd.x).toString());
    rect.setAttribute('y', (height > 0 ? constrainedStart.y : constrainedEnd.y).toString());
  }

  finalizeRectangle() {
    const rect = this.viewerContainer.nativeElement.querySelector('.rectangle.temp');
    if (!rect) return;

    rect.classList.remove('temp');
    const annotation = {
      element: rect,
      type: 'rectangle',
      x: parseFloat(rect.style.left),
      y: parseFloat(rect.style.top),
      width: parseFloat(rect.style.width),
      height: parseFloat(rect.style.height),
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'rect-' + Date.now()
    };

    this.annotations.push(annotation);
    this.completeDrawing(annotation); // Add this line
  }

  circleStartPoint: any;

  // Add to ImageAnnotatorComponent class
  createCircle(x: number, y: number): SVGCircleElement {
    this.clearExistingTempShapes();

    const svg = this.viewerContainer.nativeElement.querySelector('.annotation-svg-layer');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    // Store in viewport coordinates during drawing
    this.circleStartPoint = new OpenSeadragon.Point(x, y);

    circle.setAttribute('class', 'annotation circle temp');
    circle.setAttribute('stroke', this.color);
    circle.setAttribute('stroke-width', this.strokeWidth.toString());
    circle.setAttribute('fill', 'none');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '1'); // Start with small radius
    circle.setAttribute('vector-effect', 'non-scaling-stroke');

    svg.appendChild(circle);
    return circle;
  }

  updateCircle(x: number, y: number) {
    const circle = this.viewerContainer.nativeElement.querySelector('.circle.temp') as SVGCircleElement;
    if (!circle) return;

    // Calculate radius in viewport coordinates
    const radius = Math.sqrt(
      Math.pow(x - this.circleStartPoint.x, 2) +
      Math.pow(y - this.circleStartPoint.y, 2)
    );

    // Update only the radius
    circle.setAttribute('r', radius.toString());
  }

  finalizeCircle() {
    const circle = this.viewerContainer.nativeElement.querySelector('.circle.temp') as SVGCircleElement;
    if (!circle) return;

    circle.classList.remove('temp');

    // Convert to image coordinates for storage
    const viewportCenter = new OpenSeadragon.Point(
      parseFloat(circle.getAttribute('cx')!),
      parseFloat(circle.getAttribute('cy')!)
    );
    const imageCenter = this.viewer.viewport.viewportToImageCoordinates(
      this.viewer.viewport.windowToViewportCoordinates(viewportCenter)
    );

    const radius = parseFloat(circle.getAttribute('r')!) / this.viewer.viewport.getZoom();

    const annotation = {
      element: circle,
      type: 'circle',
      cx: imageCenter.x,
      cy: imageCenter.y,
      radius: radius,
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'circle-' + Date.now()
    };

    this.annotations.push(annotation);
    this.completeDrawing(annotation);
  }


  // Similar methods for circle, line, and freehand would be implemented
  // ... (circle, line, freehand methods would follow same pattern)

  handlePinchZoom(event: TouchEvent) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const distance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    if (this.lastTouchDistance > 0) {
      const zoomFactor = distance / this.lastTouchDistance;
      this.scale = Math.min(Math.max(this.scale * zoomFactor, 0.5), 4);
      this.updateContainerTransform();
    }
    this.lastTouchDistance = distance;
  }

  updateContainerTransform() {
    this.viewerContainer.nativeElement.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    this.viewerContainer.nativeElement.style.transformOrigin = '0 0';
  }


  loadImage(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imageUrl = e.target.result;
      this.viewer.open({
        type: 'image',
        url: imageUrl
      });

      // Clear previous annotations
      this.clearAnnotations();
    };
    reader.readAsDataURL(file);
  }

  getViewportCoordinates(event: any) {
    const canvas = this.annotationCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Convert to image coordinates
    const webPoint = new OpenSeadragon.Point(
      clientX - rect.left,
      clientY - rect.top
    );
    const viewportPoint = this.viewer.viewport.windowToViewportCoordinates(webPoint);
    const imagePoint = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);

    return {
      x: imagePoint.x,
      y: imagePoint.y
    };
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateContainerTransform();
    this.clearAnnotations();
  }

  clearAnnotations() {
    this.annotations.forEach(anno => {
      if (anno.element && anno.element.parentNode) {
        anno.element.parentNode.removeChild(anno.element);
      }
    });
    this.annotations = [];
  }

  removeLastAnnotation() {
    if (this.annotations.length > 0) {
      const last = this.annotations.pop();
      if (last.element && last.element.parentNode) {
        last.element.parentNode.removeChild(last.element);
      }
    }
  }

  setTool(tool: string) {
    this.currentTool = tool;
    this.clearExistingTempShapes();
    const tempAnnotation = this.viewerContainer.nativeElement.querySelector('.annotation.temp');
    if (tempAnnotation) {
      tempAnnotation.remove();
    }
    // this.currentTool = tool;
  }

  getImageBounds() {
    const viewportBounds = this.viewer.viewport.getBounds();
    const imageBounds = this.viewer.viewport.viewportToImageRectangle(viewportBounds);
    return {
      left: 0,
      top: 0,
      right: this.viewer.world.getItemAt(0).source.dimensions.x,
      bottom: this.viewer.world.getItemAt(0).source.dimensions.y,
      width: this.viewer.world.getItemAt(0).source.dimensions.x,
      height: this.viewer.world.getItemAt(0).source.dimensions.y
    };
  }

  constrainToImage(x: number, y: number) {
    const bounds = this.getImageBounds();
    return {
      x: Math.max(bounds.left, Math.min(bounds.right, x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, y))
    };
  }

  saveAnnotation() {
    if (this.shape && this.shape[1]) {
      this.shape[1]['data-tooltip-text'] = this.annotationText;
      this.annotationBoxVisibility = false;
      // Save to your storage if needed
    }
  }

  // saveAnnotation() {
  //   if (this.shape) {
  //     this.shape.text = this.annotationText;
  //     this.annotationBoxVisibility = false;
  //     // Save to your annotations array
  //   }
  // }

  cancelAnnotation() {
    this.annotationBoxVisibility = false;
    if (this.currentAnnotation.action === 'add') {
      this.deleteAnnotation();
    }
    this.cdr.detectChanges();
  }

  deleteAnnotation() {
    if (this.shape && this.shape[1] && this.viewer) {
      const annotations = this.viewer.annotations.get();
      const updatedAnnotations = annotations.filter((a: any) => a[1].id !== this.shape[1].id);
      this.viewer.annotations.set(updatedAnnotations);
    }
    this.annotationBoxVisibility = false;
  }

  completeDrawing(shape: any) {

    this.shape = shape;
    this.annotationBoxVisibility = true;
    console.log('annotationBoxVisibility set to true');

    this.currentAnnotation = {
      id: shape.id || Date.now().toString(),
      text: '',
      action: 'add'
    };
    this.currentTool = 'hand'
    console.log('Complete drawing called with:', shape);

    this.cdr.detectChanges(); // Ensure ChangeDetection runs
  }

  handleDrawingComplete(shape: any) {

    this.shape = shape;
    this.annotationBoxVisibility = true;
    this.currentAnnotation = {
      id: shape.id || 'shape-' + Date.now(),
      text: '',
      action: 'add'
    };
  }

  clearExistingTempShapes() {
    // Remove all temporary shapes from DOM
    const tempShapes = this.viewerContainer.nativeElement.querySelectorAll('.annotation');
    tempShapes.forEach((shape: any) => shape.remove());

    // Remove from annotations array if they were partially added
    // this.annotations = this.annotations.filter(anno => !anno.element.classList.contains('temp'));
    this.annotations = []
    this.shape = []
    console.log('Cleared existing temporary shapes', this.annotations);
  }


  private createSVGElement(type: string, attributes: { [key: string]: string }) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const element = document.createElementNS(svgNS, type);
    for (const key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        element.setAttribute(key, attributes[key]);
      }
    }
    return element;
  }

  setupSVGLayer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'annotation-svg-layer');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    this.viewerContainer.nativeElement.appendChild(svg);
  }


  isWithinImageBounds(x: number, y: number): boolean {
    const bounds = this.viewer.viewport.getBounds();
    const imageBounds = this.viewer.viewport.viewportToImageRectangle(bounds);

    return x >= 0 &&
      x <= imageBounds.width &&
      y >= 0 &&
      y <= imageBounds.height;
  }

  private handleDocumentClick = (event: MouseEvent) => {
    if (!this.annotationBoxVisibility) return;

    const popup = document.querySelector('#annotation-popup');
    const target = event.target as HTMLElement;

    // Check if click is outside popup
    if (popup && !popup.contains(target)) {
      this.cancelAnnotation();
    }
  }

  clearExistingShapes() {
    // Remove all shapes from DOM
    const shapes = this.viewerContainer.nativeElement.querySelectorAll('.annotation:not(.temp)');
    shapes.forEach((shape: Element) => shape.remove());

    // Clear from annotations array
    this.annotations = [];

    // Clear from OpenSeadragon if using its annotation system
    if (this.viewer?.annotations) {
      this.viewer.annotations.set([]);
    }

    console.log('Cleared all existing shapes');
  }

}
