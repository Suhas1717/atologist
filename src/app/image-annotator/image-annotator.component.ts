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
  currentTool = '';
  viewerEventsSubscription: Subscription | undefined

  constructor(private svgService: SvgService, private cdr: ChangeDetectorRef) {
  }
  ngOnDestroy(): void {

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
        scrollToZoom: false,
        pinchToZoom: true,
        flickEnabled: false
      },

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
      this.createCircle();
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

  // Add to ImageAnnotatorComponent class
  createLine(x: number, y: number) {
    this.clearExistingTempShapes();

    const existingTemp = this.viewerContainer.nativeElement.querySelector('.line.temp');
    if (existingTemp) {
      existingTemp.remove();
    }

    const line = document.createElement('div');
    line.className = 'annotation line temp';
    line.style.position = 'absolute';
    line.style.left = '0';
    line.style.top = '0';
    line.style.width = '0';
    line.style.height = this.strokeWidth + 'px';
    line.style.backgroundColor = this.color;
    line.style.transformOrigin = '0 0';
    line.style.pointerEvents = 'none';

    this.annotationLayer.nativeElement.appendChild(line);
    return line;
  }

  updateLine(x: number, y: number) {
    const constrainedEnd = this.constrainToImage(x, y);
    const constrainedStart = this.constrainToImage(this.startX, this.startY);

    let line = this.annotationLayer.nativeElement.querySelector('.line.temp') as HTMLDivElement;
    if (!line) return;

    const zoom = this.viewer.viewport.getZoom();
    const startXPx = constrainedStart.x * zoom;
    const startYPx = constrainedStart.y * zoom;
    const endXPx = constrainedEnd.x * zoom;
    const endYPx = constrainedEnd.y * zoom;

    const dx = endXPx - startXPx;
    const dy = endYPx - startYPx;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    line.style.width = length + 'px';
    line.style.transform = `translate(${startXPx}px, ${startYPx}px) rotate(${angle}rad)`;
  }

  finalizeLine() {
    const line = this.annotationLayer.nativeElement.querySelector('.line.temp') as HTMLElement;
    if (!line) return;

    line.classList.remove('temp');

    // Get the line coordinates from the DOM element
    const transform = line.style.transform;
    const translateMatch = transform.match(/translate\(([^)]+)\)/);
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    if (translateMatch && rotateMatch) {
      const [tx, ty] = translateMatch[1].split(',').map(parseFloat);
      const angle = parseFloat(rotateMatch[1]);
      const length = parseFloat(line.style.width);

      startX = tx;
      startY = ty;
      endX = tx + Math.cos(angle) * length;
      endY = ty + Math.sin(angle) * length;
    }

    // Create annotation object with all needed data
    const annotation = {
      element: line,
      type: 'line',
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'line-' + Date.now(), // Unique ID
      startX,
      startY,
      endX,
      endY,
      points: [{ x: startX, y: startY }, { x: endX, y: endY }]
    };

    this.annotations.push(annotation);

    // Trigger the annotation input popup
    this.completeDrawing(annotation);
  }

  // Add to ImageAnnotatorComponent class
  createFreehandPath(x: number, y: number) {
    this.clearExistingTempShapes();

    const existingTemp = this.viewerContainer.nativeElement.querySelector('.freehand.temp');
    if (existingTemp) {
      existingTemp.remove();
    }
    const path = document.createElement('div');
    path.className = 'annotation freehand';
    path.innerHTML = `
      <svg width="100%" height="100%" style="position:absolute;top:0;left:0">
        <path fill="none" stroke="${this.color}" stroke-width="${this.strokeWidth}" />
      </svg>
    `;
    path.dataset['type'] = 'freehand';
    path.dataset['points'] = JSON.stringify([{ x, y }]);

    this.viewerContainer.nativeElement.appendChild(path);
    return path;
  }

  updateFreehand(x: number, y: number) {
    const constrainedPoint = this.constrainToImage(x, y);

    let path = this.viewerContainer.nativeElement.querySelector('.annotation.temp') as HTMLDivElement;
    if (!path) {
      path = this.createFreehandPath(this.startX, this.startY);
      path.classList.add('temp');
    }

    const points = JSON.parse(path.dataset['points'] || '[]');
    points.push(constrainedPoint);
    path.dataset['points'] = JSON.stringify(points);

    const svgPath = path.querySelector('path') as SVGPathElement;
    if (svgPath && points.length > 0) {
      let d = 'M ' + points[0].x + ' ' + points[0].y;
      for (let i = 1; i < points.length; i++) {
        d += ' L ' + points[i].x + ' ' + points[i].y;
      }
      svgPath.setAttribute('d', d);
    }
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
  createRectangle() {
    this.clearExistingTempShapes();

    const existingTemp = this.viewerContainer.nativeElement.querySelector('.rectangle.temp');
    if (existingTemp) {
      existingTemp.remove();
    }
    const rect = document.createElement('div');
    rect.className = 'annotation rectangle temp';
    rect.style.position = 'absolute';
    rect.style.border = `${this.strokeWidth}px solid ${this.color}`;
    rect.style.pointerEvents = 'none';
    rect.style.left = `${this.startX}px`;
    rect.style.top = `${this.startY}px`;
    rect.style.width = '0px';
    rect.style.height = '0px';

    this.viewerContainer.nativeElement.appendChild(rect);
    return rect;
  }

  updateRectangle(x: number, y: number) {
    const constrainedEnd = this.constrainToImage(x, y);
    const constrainedStart = this.constrainToImage(this.startX, this.startY);

    const width = constrainedEnd.x - constrainedStart.x;
    const height = constrainedEnd.y - constrainedStart.y;

    let rect = this.viewerContainer.nativeElement.querySelector('.rectangle.temp') as HTMLDivElement;
    if (!rect) {
      rect = this.createRectangle();
    }

    rect.style.width = `${Math.abs(width)}px`;
    rect.style.height = `${Math.abs(height)}px`;
    rect.style.left = `${width > 0 ? constrainedStart.x : constrainedEnd.x}px`;
    rect.style.top = `${height > 0 ? constrainedStart.y : constrainedEnd.y}px`;
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

  // Add to ImageAnnotatorComponent class
  createCircle() {
    this.clearExistingTempShapes();

    const existingTemp = this.viewerContainer.nativeElement.querySelector('.circle.temp');
    if (existingTemp) {
      existingTemp.remove();
    }
    const circle = document.createElement('div');
    circle.className = 'annotation circle temp';
    circle.style.position = 'absolute';
    circle.style.border = `${this.strokeWidth}px solid ${this.color}`;
    circle.style.borderRadius = '50%';
    circle.style.pointerEvents = 'none';
    circle.style.left = `${this.startX}px`;
    circle.style.top = `${this.startY}px`;
    circle.style.width = '0px';
    circle.style.height = '0px';

    this.viewerContainer.nativeElement.appendChild(circle);
    return circle;
  }

  updateCircle(x: number, y: number) {
    const constrainedEnd = this.constrainToImage(x, y);
    const constrainedStart = this.constrainToImage(this.startX, this.startY);

    const dx = constrainedEnd.x - constrainedStart.x;
    const dy = constrainedEnd.y - constrainedStart.y;
    const distance = Math.min(
      Math.sqrt(dx * dx + dy * dy),
      Math.min(
        Math.min(constrainedStart.x, this.getImageBounds().width - constrainedStart.x),
        Math.min(constrainedStart.y, this.getImageBounds().height - constrainedStart.y)
      )
    );

    let circle = this.viewerContainer.nativeElement.querySelector('.circle.temp') as HTMLDivElement;
    if (!circle) {
      circle = this.createCircle();
    }

    circle.style.width = `${distance * 2}px`;
    circle.style.height = `${distance * 2}px`;
    circle.style.left = `${constrainedStart.x - distance}px`;
    circle.style.top = `${constrainedStart.y - distance}px`;
  }

  finalizeCircle() {
    const circle = this.viewerContainer.nativeElement.querySelector('.circle.temp') as HTMLDivElement;
    if (!circle) return;

    circle.classList.remove('temp');

    // Parse with error handling
    const left = parseFloat(circle.style.left.replace('px', '')) || 0;
    const top = parseFloat(circle.style.top.replace('px', '')) || 0;
    const width = parseFloat(circle.style.width.replace('px', '')) || 0;

    const annotation = {
      element: circle,
      type: 'circle',
      x: left,
      y: top,
      radius: width / 2,
      color: this.color,
      strokeWidth: this.strokeWidth,
      id: 'circle-' + Date.now(),
      // Add these for consistency with other shapes
      points: [
        { x: left, y: top },
        { x: left + width, y: top + width }
      ]
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
    console.log('Complete drawing called with:', shape);

    this.shape = shape;
    this.annotationBoxVisibility = true;
    console.log('annotationBoxVisibility set to true');

    this.currentAnnotation = {
      id: shape.id || Date.now().toString(),
      text: '',
      action: 'add'
    };
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
    const tempShapes = this.viewerContainer.nativeElement.querySelectorAll('.annotation.temp');
    tempShapes.forEach((shape: any) => shape.remove());

    // Remove from annotations array if they were partially added
    this.annotations = this.annotations.filter(anno => !anno.element.classList.contains('temp'));
    console.log('Cleared existing temporary shapes', this.annotations);
  }


  private setupSVGLayer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.setAttribute('class', 'annotation-svg-layer');
    this.viewerContainer.nativeElement.appendChild(svg);
  }

}
