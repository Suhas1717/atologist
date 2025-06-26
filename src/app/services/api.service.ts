import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IUser } from '../interfaces/IUser';

const httpOptions = {
  headers: new HttpHeaders({
    "Content-Type": 'application/json',
    "Accept": 'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})



export class ApiService {

  constructor(private http: HttpClient) { }

  url = "https://atologistinfotech.com/api/register.php";

  register(payload: IUser[]) {
    return this.http.post<IUser[]>(this.url, payload, httpOptions)
  }


}
