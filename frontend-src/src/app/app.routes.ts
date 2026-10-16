import { Routes } from '@angular/router';
import { LoginPage } from './login/login-page';
import { PaymentPage } from './payments/payment-page';
import { PaymentHistoryPage } from './payments/payment-history-page';
import { SignupPage } from './signup/signup-page';

export const routes: Routes = [
	{ path: '', component: SignupPage, pathMatch: 'full' },
	{ path: 'signup', component: SignupPage },
	{ path: 'login', component: LoginPage },
	{ path: 'payments/new', component: PaymentPage },
	{ path: 'payments/history', component: PaymentHistoryPage },
	{ path: '**', redirectTo: '' },
];
