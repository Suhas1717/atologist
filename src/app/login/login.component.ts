import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { IUser } from '../interfaces/IUser';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup
  constructor(private fb: FormBuilder, private api: ApiService) {

  }
  ngOnInit(): void {
    this.loginForm = this.fb.group({
      firstname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
      encryptpassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
      dob: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
      privacy: [false, Validators.requiredTrue]
    });

  }

  get f() { return this.loginForm.controls; }

  submitForm() {

    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
      this.api.register(this.loginForm.value).subscribe((res: IUser[]) => {
        console.log(res)
      })
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
