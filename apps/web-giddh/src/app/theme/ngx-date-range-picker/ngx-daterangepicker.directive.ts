import { ChangeDetectorRef, ComponentFactoryResolver, Directive, DoCheck, ElementRef, EventEmitter, forwardRef, HostListener, Input, KeyValueDiffer, KeyValueDiffers, OnChanges, OnInit, Output, Renderer2, SimpleChanges, ViewContainerRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import * as _moment from 'moment';
import { NgxDaterangepickerComponent } from './ngx-daterangepicker.component';
import { LocaleConfig } from './ngx-daterangepicker.config';

const moment = _moment;

@Directive({
    selector: 'input[ngxDaterangepickerMd]',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NgxDaterangepickerDirective), multi: true
        }
    ]
})
export class NgxDaterangepickerDirective implements OnInit, OnChanges, DoCheck {
    public picker: NgxDaterangepickerComponent;
    private _onChange = Function.prototype;
    private _onTouched = Function.prototype;
    private _validatorChange = Function.prototype;
    private _value: any;
    private localeDiffer: KeyValueDiffer<string, any>;
    @Input()
    minDate: _moment.Moment;
    @Input()
    maxDate: _moment.Moment;
    @Input()
    autoApply: boolean;
    @Input()
    alwaysShowCalendars: boolean;
    @Input()
    showCustomRangeLabel: boolean;
    @Input()
    linkedCalendars: boolean;
    @Input()
    singleDatePicker: boolean;
    @Input()
    showWeekNumbers: boolean;
    @Input()
    showISOWeekNumbers: boolean;
    @Input()
    showDropdowns: boolean;
    @Input()
    isInvalidDate: Function;
    @Input()
    isCustomDate: Function;
    @Input()
    showClearButton: boolean;
    @Input()
    ranges: any;
    @Input()
    opens: string;
    @Input()
    drops: string;
    firstMonthDayClass: string;
    @Input()
    lastMonthDayClass: string;
    @Input()
    emptyWeekRowClass: string;
    @Input()
    firstDayOfNextMonthClass: string;
    @Input()
    lastDayOfPreviousMonthClass: string;
    @Input()
    keepCalendarOpeningWithRange: boolean;
    @Input()
    showRangeLabelOnInput: boolean;
    @Input()
    showCancel: boolean = false;
    // timepicker variables
    @Input()
    timePicker: Boolean = false;
    @Input()
    timePicker24Hour: Boolean = false;
    @Input()
    timePickerIncrement: number = 1;
    @Input()
    timePickerSeconds: Boolean = false;
    _locale: LocaleConfig = {};
    @Input() set locale(value) {
        this._locale = {...value, ...this.localeConfig};
    }

    get locale(): any {
        return this._locale;
    }

    @Input()
    private _endKey: string = 'endDate';
    private _startKey: string = 'startDate';
    @Input() set startKey(value) {
        if (value !== null) {
            this._startKey = value;
        } else {
            this._startKey = 'startDate';
        }
    };

    @Input() set endKey(value) {
        if (value !== null) {
            this._endKey = value;
        } else {
            this._endKey = 'endDate';
        }
    };

    notForChangesProperty: Array<string> = [
        'locale',
        'endKey',
        'startKey'
    ];

    get value() {
        return this._value || null;
    }

    set value(val) {
        this._value = val;
        this._onChange(val);
        this._changeDetectorRef.markForCheck();
    }

    @Output() onChange: EventEmitter<Object> = new EventEmitter();
    @Output() rangeClicked: EventEmitter<Object> = new EventEmitter();
    @Output() datesUpdated: EventEmitter<Object> = new EventEmitter();

    constructor(
        public viewContainerRef: ViewContainerRef,
        public _changeDetectorRef: ChangeDetectorRef,
        private _componentFactoryResolver: ComponentFactoryResolver,
        private _el: ElementRef,
        private _renderer: Renderer2,
        private differs: KeyValueDiffers,
        private localeConfig: LocaleConfig
    ) {
        this.drops = 'down';
        this.opens = 'right';
        const componentFactory = this._componentFactoryResolver.resolveComponentFactory(NgxDaterangepickerComponent);
        viewContainerRef.clear();
        const componentRef = viewContainerRef.createComponent(componentFactory);
        this.picker = (<NgxDaterangepickerComponent> componentRef.instance);
        this.picker.inline = false; // set inline to false for all directive usage
    }

    ngOnInit() {
        this.picker.rangeClicked.asObservable().subscribe((range: any) => {
            this.rangeClicked.emit(range);
        });
        this.picker.datesUpdated.asObservable().subscribe((range: any) => {
            this.datesUpdated.emit(range);
        });
        this.picker.choosedDate.asObservable().subscribe((change: any) => {
            if (change) {
                const value = {};
                value[this._startKey] = change.startDate;
                value[this._endKey] = change.endDate;
                this.value = value;
                this.onChange.emit(value);
                if (typeof change.name === 'string') {
                    this._el.nativeElement.value = change.name;
                }
            }
        });
        this.picker.firstMonthDayClass = this.firstMonthDayClass;
        this.picker.lastMonthDayClass = this.lastMonthDayClass;
        this.picker.emptyWeekRowClass = this.emptyWeekRowClass;
        this.picker.firstDayOfNextMonthClass = this.firstDayOfNextMonthClass;
        this.picker.lastDayOfPreviousMonthClass = this.lastDayOfPreviousMonthClass;
        this.picker.drops = this.drops;
        this.picker.opens = this.opens;
        this.localeDiffer = this.differs.find(this.locale).create();
    }

    ngOnChanges(changes: SimpleChanges): void {
        for (let change in changes) {
            if (changes.hasOwnProperty(change)) {
                if (this.notForChangesProperty.indexOf(change) === -1) {
                    this.picker[change] = changes[change].currentValue;
                }
            }
        }
    }

    ngDoCheck() {
        if (this.localeDiffer) {
            const changes = this.localeDiffer.diff(this.locale);
            if (changes) {
                this.picker.updateLocale(this.locale);
            }
        }
    }

    @HostListener('blur')
    onBlur() {
        this._onTouched();
    }

    @HostListener('click', ['$event'])
    open(event?: any) {
        this.picker.show(event);
        setTimeout(() => {
            this.setPosition();
        });
    }

    @HostListener("document:keyup.esc", ['$event'])
    hide(e?) {
        this.picker.hide(e);
    }

    @HostListener('document:keyup', ['$event'])
    inputChanged(e) {
        if (e.target.tagName.toLowerCase() !== 'input') {
            return;
        }
        if (!e.target.value.length) {
            return;
        }
        const dateString = e.target.value.split(this.picker.locale.separator);
        let start = null, end = null;
        if (dateString.length === 2) {
            start = moment(dateString[0], this.picker.locale.format);
            end = moment(dateString[1], this.picker.locale.format);
        }
        if (this.singleDatePicker || start === null || end === null) {
            start = moment(e.target.value, this.picker.locale.format);
            end = start;
        }
        if (!start.isValid() || !end.isValid()) {
            return;
        }
        this.picker.setStartDate(start);
        this.picker.setEndDate(end);
        this.picker.updateView();

    }

    toggle(e?) {
        if (this.picker.isShown) {
            this.hide(e);
        } else {
            this.open(e);
        }
    }

    clear() {
        this.picker.clear();
    }

    writeValue(value) {
        this.value = value;
        this.setValue(value);
    }

    registerOnChange(fn) {
        this._onChange = fn;
    }

    registerOnTouched(fn) {
        this._onTouched = fn;
    }

    private setValue(val: any) {
        if (val) {
            if (val[this._startKey]) {
                this.picker.setStartDate(val[this._startKey]);
            }
            if (val[this._endKey]) {
                this.picker.setEndDate(val[this._endKey]);
            }
            this.picker.calculateChosenLabel();
            if (this.picker.chosenLabel) {
                this._el.nativeElement.value = this.picker.chosenLabel;
            }
        } else {
            this.picker.clear();
        }
    }

    /**
     * Set position of the calendar
     */
    setPosition() {
        let style;
        let containerTop;
        const container = this.picker.pickerContainer.nativeElement;
        const element = this._el.nativeElement;
        if (this.drops && this.drops === 'up') {
            containerTop = (element.offsetTop - container.clientHeight) + 'px';
        } else {
            containerTop = 'auto';
        }
        if (this.opens === 'left') {
            style = {
                top: containerTop,
                left: (element.offsetLeft - container.clientWidth + element.clientWidth) + 'px',
                right: 'auto'
            };
        } else if (this.opens === 'center') {
            style = {
                top: containerTop,
                left: (element.offsetLeft + element.clientWidth / 2
                    - container.clientWidth / 2) + 'px',
                right: 'auto'
            };
        } else {
            style = {
                top: containerTop,
                left: element.offsetLeft + 'px',
                right: 'auto'
            };
        }
        if (style) {
            this._renderer.setStyle(container, 'top', style.top);
            this._renderer.setStyle(container, 'left', style.left);
            this._renderer.setStyle(container, 'right', style.right);
        }

    }

    /**
     * For click outside of the calendar's container
     * @param event event object
     * @param targetElement target element object
     */
    @HostListener('document:click', ['$event', '$event.target'])
    outsideClick(event, targetElement: HTMLElement): void {
        if (!targetElement) {
            return;
        }
        if (targetElement.classList.contains('ngx-daterangepicker-action')) {
            return;
        }
        const clickedInside = this._el.nativeElement.contains(targetElement);
        if (!clickedInside) {
            this.hide();
        }
    }
}