import { Component, ElementRef, HostListener, OnInit, ViewChild,EventEmitter, Input,Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeafletControlLayersConfig, LeafletDirective } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import { catchError, delay, interval, of, switchMap, tap, timer } from 'rxjs';
import { GetFleetsRequest,VehicleViewModel,VehicleType,Location,ProgressStatusEnum,ProgressStatus } from 'src/api/models';
import { FleetsService, VehiclesService,UploadService  } from 'src/api/services';

import { HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

    @Input() public disabled: boolean=false;
    @Output() public uploadStatus: EventEmitter<ProgressStatus>;

    @ViewChild('searchFilterField') searchInput!: ElementRef<HTMLInputElement>;
    @ViewChild(LeafletDirective, { static: true }) leafletDirective!: LeafletDirective;
    @ViewChild('inputFile') inputFile!: ElementRef;

    options: L.MapOptions = {
        layers: [
            L.tileLayer(
                'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
                maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            })
        ],
        zoom: 14,
        zoomControl: false,
        center: L.latLng(14.594777, 121.054463)
    };

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {
            'Default': L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', { maxZoom: 20 }),
            'CH Swisstopo LBM Dark': L.tileLayer('https://api.maptiler.com/maps/ch-swisstopo-lbm-dark/{z}/{x}/{y}.png?key=dKFpUJ6juOZ4bJH0Cl6y', { maxZoom: 18 }),
            'Basic': L.tileLayer('https://api.maptiler.com/maps/bright/{z}/{x}/{y}.png?key=dKFpUJ6juOZ4bJH0Cl6y', { maxZoom: 18 })
        },
        overlays: {

        }
    }


    fleets: any = [];
    activeFleet: number | undefined = undefined;
    layers: L.Layer[] = [];
    searchFilter!: string;

    vehiclesLoading: boolean = false;
    fleetsLoading: boolean = false;
    isShowing:boolean=true;
    isHiding:boolean=false;

    public files: string[]=[];
    public percentage: number|undefined=0;
    public showProgress: boolean=false;
    public showUploadError: boolean=false;

    constructor(private uploadservice:UploadService,
        private vehiclesService: VehiclesService,
        private fleetsService: FleetsService,
        private activatedRoute: ActivatedRoute) {
            this.uploadStatus = new EventEmitter<ProgressStatus>();

        }

    ngOnInit(): void {
            

        this.activatedRoute.queryParams.subscribe(params => {
            let fleetId = params['fleet'];
            if (fleetId == undefined) this.activeFleet = undefined;
            else this.activeFleet = parseInt(fleetId);

            this.loadVehicles();
        });

        let request: GetFleetsRequest = {};
        this.fleetsLoading = true;
        this.fleetsService.apiFleetsGet$Json({ request: request })
            .pipe(delay(1000))
            .subscribe({
                next: (response) => {
                    if (response.fleets == null) return;

                    this.fleets = response.fleets;
                },
                error: (response) => {
                    this.fleetsLoading = false;
                },
                complete: () => {
                    this.fleetsLoading = false;
                }
            });

        this.getFiles();
    }

    private getFiles() {
        this.uploadservice.getFiles().subscribe(
          (data:string[]) => {
            this.files = data;
          }
        );
      }

    hideOrShow(){
        this.isShowing=!this.isShowing
        this.isHiding=!this.isHiding
        console.log("showing? ",this.isShowing)
    }

    public addVehicles(event:any) {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            this.uploadStatus.emit({status: ProgressStatusEnum.START});
            this.uploadservice.uploadFile(file).subscribe(
              data => {
                if (data) {
                  switch (data.type) {
                    case HttpEventType.UploadProgress:
                      if(data.total) {
                        this.uploadStatus.emit( {status: ProgressStatusEnum.IN_PROGRESS, percentage: Math.round((data.loaded / data.total) * 100)});
                      } 
                      break;
                    case HttpEventType.Response:
                      this.inputFile.nativeElement.value = '';
                      this.uploadStatus.emit( {status: ProgressStatusEnum.COMPLETE});
                      break;
                  }
                }
              },
              error => {
                this.inputFile.nativeElement.value = '';
                this.uploadStatus.emit({status: ProgressStatusEnum.ERROR});
              }
            );
          }
    }

    public uploadBar(event: ProgressStatus) {
        switch (event.status) {
          case ProgressStatusEnum.START:
            this.showUploadError = false;
            break;
          case ProgressStatusEnum.IN_PROGRESS:
            this.showProgress = true;
            this.percentage = event.percentage;
            break;
          case ProgressStatusEnum.COMPLETE:
            this.showProgress = false;
            this.getFiles();
            break;
          case ProgressStatusEnum.ERROR:
            this.showProgress = false;
            this.showUploadError = true;
            break;
        }
      }

    loadVehicles() {
        this.vehiclesLoading = true;
        timer(0, 3000)
            .pipe(
                delay(1000),
                switchMap(() => this.vehiclesService.apiVehiclesGet$Json({ FleetId: this.activeFleet })),
                tap(response => {
                    this.layers = this.layers.filter(l => false);
                    this.vehiclesLoading = false;
                    console.log("response it: ",response)
                    if (response.vehicles == null) return;

                    let vehicles = response.vehicles.filter(v => v.lastKnownLocation != null);
                    let markers = vehicles.map(v => {
                        let latLng = L.latLng(v.lastKnownLocation!!.latitude!!, v.lastKnownLocation!!.longitude!!);
                        let marker = L.marker(latLng, {
                            icon: L.icon({
                                iconUrl: 'assets/truck.png',
                                iconSize: [48, 48],
                            }),
                            title: v.name!!
                        });

                        marker.bindPopup(`<strong>${v.name}</strong>`);

                        marker.on('mouseover', (e) => {
                            e.target.openPopup();
                        });

                        return marker;
                    });

                    markers.forEach(m => this.layers.push(m));
                }),
                catchError(response => {
                    this.vehiclesLoading = false;
                    return of(response);
                })
            ).subscribe();
    }

    get filteredLayers(): L.Layer[] {
        if (this.searchFilter == null) return this.layers;

        return this.layers.filter(l => {
            if (l instanceof L.Marker) {
                let marker: L.Marker = l;
                return marker.options.title?.toLowerCase().includes(this.searchFilter.toLowerCase());
            }

            return false;
        });
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown($event: KeyboardEvent): void {
        if ($event.getModifierState && $event.getModifierState('Control') && $event.keyCode === 70) {
            $event.preventDefault();
            this.searchInput.nativeElement.focus();
        }
    }
}
