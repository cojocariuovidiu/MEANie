import { Store } from '@ngrx/store';
import {
  HttpResponse,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as AuthenticationActions from '../store/authentication.actions';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/withLatestFrom';
import { AuthenticationState, AuthenticationSelectors } from '../store';
import { isEmpty } from 'lodash';

@Injectable()
export class AuthenticationInterceptor implements HttpInterceptor {

  private urlFilters = ['/api'];
  private tokenExpiresIn$;

  constructor(private store: Store<AuthenticationState>, private authenticationSelectors: AuthenticationSelectors) {
    this.tokenExpiresIn$ = this.store.select(this.authenticationSelectors.getTokenExpiresIn)
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    if (request.url.match(/(?!\api\/)/)) {
      return next.handle(request);
    }

    return this.tokenExpiresIn$
    .first()
    .switchMap(tokenExpiresIn => {
      if (tokenExpiresIn && tokenExpiresIn < Date.now()) {
        this.store.dispatch(new AuthenticationActions.Logout('Token Expired'));
        return Observable.empty();
      }
      return next
      .handle(request)
      .catch(error => {
        if (error instanceof HttpErrorResponse && error.status === 403 && !error.url.includes('/auth')) {
          this.store.dispatch(new AuthenticationActions.Logout('Unauthorized Operation'));
          return Observable.empty();
        }
        return Observable.throw(error);              
      });
    });
  }
}
