import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageAnnotatorComponent } from './image-annotator.component';

describe('ImageAnnotatorComponent', () => {
  let component: ImageAnnotatorComponent;
  let fixture: ComponentFixture<ImageAnnotatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImageAnnotatorComponent]
    });
    fixture = TestBed.createComponent(ImageAnnotatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
