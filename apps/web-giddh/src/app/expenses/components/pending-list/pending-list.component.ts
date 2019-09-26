import { Component, OnInit, } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending-list',
  templateUrl: './pending-list.component.html',
  styleUrls: ['./pending-list.component.scss'],
})

export class PendingListComponen implements OnInit {




  expensesItem = [
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Stationery A/c', dotWarning: 'dot-warning', dotPrimary: '' ,dotSuccess: '' ,amount: 1400, payment: 'ICICI A/c',
    card: '', cash: 'icon-cash',  File: 'attach file', FileIcon: 'icon-file-path', ImgeIcon: '', ImgePath: '', multipleIcon: '', multiple: '', description: 'Dummy text sample test', Action: ''},
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Fuel A/c', dotWarning: '', dotPrimary: 'dot-primary' ,dotSuccess: '', amount: 1400, payment: 'Cash A/c',
    card: '', cash: 'icon-cash',  File: '', FileIcon: '', ImgeIcon: 'icon-image', ImgePath: 'sampleimage.jpg', multipleIcon: '', multiple: '', description: 'Dummy text sample test', Action: ''},
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Stationery A/c', dotWarning: 'dot-warning', dotPrimary: '' ,dotSuccess: '', amount: 1400, payment: 'SBI A/c',
    card: 'icon-atm-card', cash: '',  File: '', FileIcon: '', ImgeIcon: '', ImgePath: '', multipleIcon: 'icon-folder-group', multiple: 'Multiple', description: 'Dummy text sample test', Action: ''},
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Fuel A/c', dotWarning: '', dotPrimary: 'dot-primary' ,dotSuccess: '', amount: 1400, payment: 'Cash A/c',
    card: '', cash: 'icon-cash',  File: 'attach file', FileIcon: 'icon-file-path', ImgeIcon: '', ImgePath: '', multipleIcon: '', multiple: '', description: 'Dummy text sample test', Action: ''},
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Others', dotWarning: '', dotPrimary: 'dot-primary' ,dotSuccess: '', amount: 1400, payment: 'ICICI A/c',
    card: 'icon-atm-card', cash: '',  File: '', FileIcon: '', ImgeIcon: 'icon-image', ImgePath: 'sampleimage.jpg', multipleIcon: '', multiple: '', description: 'Dummy text sample test', Action: ''},
    {date: '29-07-2019', SubmittedBy: 'Pratik Piplode', account: 'Money Request', dotWarning: '', dotPrimary: '' ,dotSuccess: 'dot-success', amount: 1400, payment: 'Cash A/c',
    card: '', cash: 'icon-cash',  File: '', FileIcon: '', ImgeIcon: '', ImgePath: '', multipleIcon: 'icon-folder-group', multiple: 'Multiple', description: 'Dummy text sample test', Action: ''},
  ]

  // for (let i = 1; i <= 31; i++) {

  // }

  constructor() {

  }

  public ngOnInit() {
  }
}