export const CompanyType1 = {
  big_tech: 'big_tech',
  sme: 'sme',
  startup: 'startup',
  foreign: 'foreign',
  public: 'public',
} as const;
export type CompanyType1 = (typeof CompanyType1)[keyof typeof CompanyType1];

// CompanyType2는 이제 user-editable — company_types 테이블에서 관리.
// companies.type2는 plain text이며 CreateCompanyDto가 형식만 검증.

export const Priority = {
  important: 'important',
  normal: 'normal',
  urgent: 'urgent',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const EmploymentType = {
  intern_to_regular: 'intern_to_regular',
  full_time: 'full_time',
  contract: 'contract',
  etc: 'etc',
} as const;
export type EmploymentType =
  (typeof EmploymentType)[keyof typeof EmploymentType];

export const ApplicationStatus = {
  not_applied: 'not_applied',
  applied: 'applied',
  document_passed: 'document_passed',
  document_failed: 'document_failed',
  interview_1_passed: 'interview_1_passed',
  interview_1_failed: 'interview_1_failed',
  interview_2_passed: 'interview_2_passed',
  interview_2_failed: 'interview_2_failed',
  final_passed: 'final_passed',
  final_failed: 'final_failed',
  withdrawn: 'withdrawn',
} as const;
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
