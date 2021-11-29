/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpResponse } from '@angular/common/http';
import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';
import { RequestBuilder } from '../request-builder';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import { GetFleetsRequest } from '../models/get-fleets-request';
import { GetFleetsResponse } from '../models/get-fleets-response';

 
@Injectable()
export class UploadService {
  private baseApiUrl: string;
  private apiUploadUrl: string;
  private apiFileUrl: string;
  
  constructor(private httpClient: HttpClient) {
    this.baseApiUrl = 'http://localhost:5001/api/';
    this.apiUploadUrl = this.baseApiUrl + 'upload';
    this.apiFileUrl = this.baseApiUrl + 'files';
  }
  
  public uploadFile(file: Blob): Observable<HttpEvent<void>> {
    const formData = new FormData();
    formData.append('file', file);
  
    return this.httpClient.request(new HttpRequest(
      'POST',
      this.apiUploadUrl,
      formData,
      {
        reportProgress: true
      }));
  }
  
  public getFiles(): Observable<string[]> {
    return this.httpClient.get<string[]>(this.apiFileUrl);
  }
}