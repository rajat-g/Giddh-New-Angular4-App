/**
 * Created by arpit meena on 13-07-2017.
 * Model for create-new-role api request
 * POST call
 * API:: (create-new-role) /company/:companyUniqueName/role
 * used to create new role
 */

export interface Permission {
  code: string;
  isSelected?: boolean;
}

export interface Scope {
  name: string;
  permissions: Permission[];
  selectAll?: boolean;
}

export interface UpdateRoleRequest {
  scopes: Scope[];
  roleUniqueName: string;
  uniqueName?: string;
}

export interface CreateNewRoleResponse {
  isFixed: boolean;
  scopes: Scope[];
  uniqueName: string;
  name: string;
}

export interface CreateNewRoleRequest {
  name: string;
  scopes: Scope[];
  isFixed?: boolean;
  uniqueName?: string;
}

export interface IRoleCommonResponseAndRequest {
  name: string;
  scopes: Scope[];
  isFixed?: boolean;
  uniqueName?: string;
}

export class ShareRequestForm {
  public emailId: string;
  public from: string; // dd-MM-yyyy format
  public to: string; // dd-MM-yyyy format
  public duration: number; // numeric
  public period: string; // DAY
  public allowedIps: any[]; // array of strings
  public allowedCidrs: any[]; // array of strings
  public ipsStr?: string; // converted from array for UI
  public cidrsStr?: string; // converted from array for UI
  public entity: string;
  public entityUniqueName: string;
  public userEmail?: string;
  public userName?: string;
  public userUniqueName?: string;
  public roleName?: string;
  public roleUniqueName?: string;
}

export interface ISharedWithResponseForUI {
  [key: string]: ShareRequestForm[];
}
