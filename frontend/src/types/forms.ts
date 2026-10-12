// Form shapes used by the auth and job forms.

export interface EmployerLoginForm {
  email: string;
  password: string;
}

export interface EmployerRegisterForm {
  companyName?: string;
  email?: string;
  password?: string;
}

export interface WorkerRegisterForm {
  name: string;
  skills: string;
  location: string;
  contact: string;
}

export interface JobFormData {
  jobTitle: string;
  companyName: string;
  location: string;
  salary: string;
  skills: string;
  description: string;
  contactInfo: string;
  isUrgent: boolean;
  paymentMethod: string;
}
