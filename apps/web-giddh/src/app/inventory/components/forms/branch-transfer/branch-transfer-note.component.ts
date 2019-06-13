import {Component, EventEmitter, Input, NgZone, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {BsDatepickerConfig} from 'ngx-bootstrap';
import {InventoryEntry, InventoryUser} from '../../../../models/api-models/Inventory-in-out';

import {IStocksItem} from '../../../../models/interfaces/stocksItem.interface';
import {IOption} from '../../../../theme/ng-virtual-select/sh-options.interface';
import * as moment from 'moment';
import {StockUnitRequest} from '../../../../models/api-models/Inventory';
import {digitsOnly, stockManufacturingDetailsValidator} from '../../../../shared/helpers';
import {ToasterService} from '../../../../services/toaster.service';
import {InventoryService} from '../../../../services/inventory.service';

@Component({
  selector: 'branch-transfer-note',
  templateUrl: './branch-transfer-note.component.html',
  styleUrls: ['./branch-transfer-note.component.scss']
})

export class BranchTransferNoteComponent implements OnInit, OnChanges {
  @Output() public onCancel = new EventEmitter();
  @Output() public onSave = new EventEmitter<InventoryEntry>();

  @Input() public stockList: IStocksItem[];
  @Input() public stockUnits: StockUnitRequest[];
  @Input() public userList: InventoryUser[];

  @Input() public isLoading: boolean;
  public stockListOptions: IOption[];
  public stockUnitsOptions: IOption[];
  public userListOptions: IOption[];
  public form: FormGroup;
  public config: Partial<BsDatepickerConfig> = {dateInputFormat: 'DD-MM-YYYY'};
  public mode: 'receiver' | 'product' = 'product';
  public today = new Date();
  public editLinkedStockIdx: any = null;
  public editModeForLinkedStokes: boolean = false;
  public disableStockButton: boolean = false;
  public InventoryEntryValue: InventoryEntry = {};

  constructor(private _fb: FormBuilder, private _toasty: ToasterService, private _inventoryService: InventoryService,
              private _zone: NgZone) {
    this.initializeForm(true);
  }

  public get transferDate(): FormControl {
    return this.form.get('transferDate') as FormControl;
  }

  public get inventoryUser(): FormControl {
    return this.form.get('inventoryUser') as FormControl;
  }

  public get stock(): FormControl {
    return this.form.get('stock') as FormControl;
  }

  public get transfers(): FormArray {
    return this.form.get('transfers') as FormArray;
  }

  public get description(): FormControl {
    return this.form.get('description') as FormControl;
  }

  public get manufacturingDetails(): FormGroup {
    return this.form.get('manufacturingDetails') as FormGroup;
  }

  public get isManufactured(): FormControl {
    return this.form.get('isManufactured') as FormControl;
  }

  public ngOnInit() {
    this.InventoryEntryValue.transactions = [];
    this.InventoryEntryValue.source = {
      uniqueName: null,
      entity: null
    };
    this.InventoryEntryValue.destination = {
      uniqueName: null,
      entity: null
    };
    this.manufacturingDetails.disable();
    this.isManufactured.valueChanges.subscribe(val => {
      this.manufacturingDetails.reset();
      val ? this.manufacturingDetails.enable() : this.manufacturingDetails.disable();
    });
  }

  public initializeForm(initialRequest: boolean = false) {
    this.form = this._fb.group({
      transferDate: [moment().format('DD-MM-YYYY'), Validators.required],
      transfers: this._fb.array([], Validators.required),
      description: [''],
      inventoryUser: [],
      stock: [],
      isManufactured: [false],
      manufacturingDetails: this._fb.group({
        manufacturingQuantity: ['', [Validators.required, digitsOnly]],
        manufacturingUnitCode: ['', [Validators.required]],
        linkedStocks: this._fb.array([
          this.initialIManufacturingDetails()
        ]),
        linkedStockUniqueName: [''],
        linkedQuantity: ['', digitsOnly],
        linkedStockUnitCode: [''],
      }, {validator: stockManufacturingDetailsValidator})
    });
    if (initialRequest) {
      this.addTransactionItem();
    }
  }

  public initialIManufacturingDetails() {
    // initialize our controls
    return this._fb.group({
      stockUniqueName: [''],
      stockUnitCode: [''],
      quantity: ['', digitsOnly]
    });
  }

  public modeChanged(mode: 'receiver' | 'product') {
    this.mode = mode;
    this.form.reset();
    this.transferDate.patchValue(moment().format('DD-MM-YYYY'));
    this.transfers.controls = this.transfers.controls.filter(trx => false);

    if (this.mode === 'receiver') {
      this.stock.setValidators(Validators.required);
      this.inventoryUser.clearValidators();
      this.inventoryUser.updateValueAndValidity();
    } else {
      this.inventoryUser.setValidators(Validators.required);
      this.stock.clearValidators();
      this.stock.updateValueAndValidity();
    }
    this.addTransactionItem();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.stockList && this.stockList) {
      this.stockListOptions = this.stockList.map(p => ({label: p.name, value: p.uniqueName}));
    }
    if (changes.stockUnits && this.stockUnits) {
      this.stockUnitsOptions = this.stockUnits.map(p => ({label: `${p.name} (${p.code})`, value: p.code}));
    }
    if (changes.userList && this.userList) {
      this.userListOptions = this.userList.map(p => ({label: p.name, value: p.uniqueName}));
    }
  }

  public addTransactionItem(control?: AbstractControl) {

    if (control && (control.invalid || this.stock.invalid || this.inventoryUser.invalid)) {
      return;
    }

    const items = this.transfers;
    const value = items.length > 0 ? items.at(0).value : {
      type: '',
      quantity: '',
      rate: '',
      value: '',
      inventoryUser: '',
      stock: '',
      stockUnit: '',
    };

      const transaction = this._fb.group({
        type: ['RECEIVER', Validators.required],
        quantity: ['', Validators.required],
        value: ['', Validators.required],
        rate: ['', Validators.required],
        inventoryUser: [this.mode === 'product' ? value.inventoryUser : '', this.mode === 'receiver' ? [Validators.required] : []],
        stock: [this.mode === 'receiver' ? value.stock : '', this.mode === 'product' ? [Validators.required] : []],
        stockUnit: [this.mode === 'receiver' ? value.stockUnit : '', Validators.required]
      });


    transaction.updateValueAndValidity();
    items.push(transaction);
  }

  public deleteTransactionItem(index: number) {
    const items = this.form.get('transfers') as FormArray;
    items.removeAt(index);
  }

  public userChanged(option: IOption, index: number, type?: string) {
    const items = this.form.get('transfers') as FormArray;
    const user = this.userList.find(p => p.uniqueName === option.value);
    const inventoryUser = user ? {uniqueName: user.uniqueName} : null;

    if (type === 'source') {
      this.InventoryEntryValue.source.uniqueName = option.value;
      this.InventoryEntryValue.source.entity = 'company';
    }
    if (type === 'destination') {
      this.InventoryEntryValue.destination.uniqueName = option.value;
      this.InventoryEntryValue.destination.entity = 'company';
    }


    if (index || index >= 0) {
      const control = items.at(index);
      control.patchValue({
        ...control.value,
        inventoryUser
      });
    } else {
      items.controls.forEach(c => c.patchValue({...c.value, inventoryUser}));
    }
  }

  public async stockChanged(option: IOption, index: number) {
    const items = this.transfers;
    const stockItem = this.stockList.find(p => p.uniqueName === option.value);
    const stock = stockItem ? {uniqueName: stockItem.uniqueName} : null;
    const stockUnit = stockItem ? stockItem.stockUnit.code : null;

    if (stockItem && this.mode === 'receiver') {
      // this.InventoryEntryValue.destination.uniqueName=option.value;
      // this.InventoryEntryValue.destination.entity='product';

      this.stock.disable();
      try {
        let stockDetails = await this.getStockDetails(stockItem);
        this._zone.run(() => {
          this.stock.enable();
        });

        if (stockDetails.body && stockDetails.body.manufacturingDetails) {
          let mfd = stockDetails.body.manufacturingDetails;
          this.isManufactured.patchValue(true);

          this.manufacturingDetails.patchValue({
            manufacturingQuantity: mfd.manufacturingQuantity,
            manufacturingUnitCode: mfd.manufacturingUnitCode
          });

          mfd.linkedStocks.map((item, i) => {
            this.addItemInLinkedStocks(item, i, mfd.linkedStocks.length - 1);
          });

        } else {
          this.isManufactured.patchValue(false);
        }

      } catch (e) {
        this._zone.run(() => {
          this.stock.enable();
        });
        this._toasty.errorToast('something went wrong. please try again!');
      }
    }

    if (index || index >= 0) {
      const control = items.at(index);
      control.patchValue({...control.value, stock, stockUnit});
    } else {
      items.controls.forEach(c => c.patchValue({...c.value, stock, stockUnit}));
    }
  }

  /**
   * findAddedStock
   */
  public findAddedStock(uniqueName, i) {
    const manufacturingDetailsContorl = this.manufacturingDetails;
    const control = manufacturingDetailsContorl.controls['linkedStocks'] as FormArray;
    let count = 0;
    _.forEach(control.controls, (o) => {
      if (o.value.stockUniqueName === uniqueName) {
        count++;
      }
    });

    if (count > 1) {
      this._toasty.errorToast('Stock already added.');
      this.disableStockButton = true;
      return;
    } else {
      const stockItem = this.stockList.find(p => p.uniqueName === uniqueName);
      const stockUnit = stockItem ? stockItem.stockUnit.code : null;
      control.at(i).get('stockUnitCode').patchValue(stockUnit);
      this.disableStockButton = false;
    }
  }

  public addItemInLinkedStocks(item, i?: number, lastIdx?) {
    const manufacturingDetailsContorl = this.manufacturingDetails;
    const control = manufacturingDetailsContorl.controls['linkedStocks'] as FormArray;
    let frmgrp = this.initialIManufacturingDetails();
    if (item) {
      if (item.controls) {
        let isValid = this.validateLinkedStock(item.value);
        if (isValid) {
          // control.controls[i] = item;
        } else {
          return this._toasty.errorToast('All fields are required.');
        }

      } else {
        let isValid = this.validateLinkedStock(item);
        if (isValid) {
          frmgrp.patchValue(item);
          control.controls[i] = frmgrp;
        } else {
          return this._toasty.errorToast('All fields are required.');
        }
      }
      if (i === lastIdx) {
        control.controls.push(this.initialIManufacturingDetails());
      }
    }
  }

  public removeItemInLinkedStocks(i: number) {
    if (this.editLinkedStockIdx === i) {
      this.editModeForLinkedStokes = false;
      this.editLinkedStockIdx = null;
    }
    const manufacturingDetailsContorl = this.manufacturingDetails;
    const control = manufacturingDetailsContorl.controls['linkedStocks'] as FormArray;
    control.removeAt(i);
  }

  /**
   * validateLinkedStock
   */
  public validateLinkedStock(item) {
    return !(!item.quantity || !item.stockUniqueName || !item.stockUnitCode);
  }

  public save() {
    if (this.form.valid) {
      let rawValues = this.transfers.getRawValue();

      rawValues.map(rv => {
        rv.stockUnit = {code: rv.stockUnit};
        return rv;
      });

      if (this.mode === 'receiver') {
        this.InventoryEntryValue.transferProducts = false
      } else {
        this.InventoryEntryValue.transferProducts = true
      }
      this.InventoryEntryValue.transferProducts = false
      this.InventoryEntryValue.transferDate = moment(this.transferDate.value, 'DD-MM-YYYY').format('DD-MM-YYYY');
      this.InventoryEntryValue.description = this.description.value;
      this.InventoryEntryValue.transfers = rawValues


      // let value: InventoryEntry = {
      //   transferDate: moment(this.transferDate.value, 'DD-MM-YYYY').format('DD-MM-YYYY'),
      //   description: this.description.value,
      //   transfers: rawValues,
      // };


      if (this.mode === 'receiver') {
        this.InventoryEntryValue.transfers = this.InventoryEntryValue.transfers.map(trx => {
          let linkedStocks: any = this.removeBlankLinkedStock(this.manufacturingDetails.controls.linkedStocks);
          trx.manufacturingDetails = {
            manufacturingQuantity: this.manufacturingDetails.value.manufacturingQuantity,
            manufacturingUnitCode: this.manufacturingDetails.value.manufacturingUnitCode,
            linkedStocks: linkedStocks.map(l => l),
          };
          return trx;
        });
        this.InventoryEntryValue.isManufactured = this.isManufactured.value;
      }
      console.log("this.InventoryEntryValue", this.InventoryEntryValue);
      this.onSave.emit({...this.InventoryEntryValue});
    }
  }

  public async getStockDetails(stockItem: IStocksItem) {
    return await this._inventoryService.GetStockDetails(stockItem.stockGroup.uniqueName, stockItem.uniqueName).toPromise();
  }

  /**
   * removeBlankLinkedStock
   */
  public removeBlankLinkedStock(linkedStocks) {
    const manufacturingDetailsContorl = this.manufacturingDetails;
    const control = manufacturingDetailsContorl.controls['linkedStocks'] as FormArray;
    let rawArr = control.getRawValue();
    _.forEach(rawArr, (o, i) => {
      if (!o.quantity || !o.stockUniqueName || !o.stockUnitCode) {
        rawArr = _.without(rawArr, o);
        control.removeAt(i);
      }
    });
    linkedStocks = _.cloneDeep(rawArr);
    return linkedStocks;
  }
}
