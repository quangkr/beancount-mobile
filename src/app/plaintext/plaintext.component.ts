import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterExtensions, PageRoute } from 'nativescript-angular/router';
import { registerElement } from 'nativescript-angular/element-registry';

import { Subscription } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { Page } from 'tns-core-modules/ui/page';
import { Fab } from '@nstudio/nativescript-floatingactionbutton';
import { PullToRefresh } from '@nstudio/nativescript-pulltorefresh';
import { makeText as makeToast } from 'nativescript-toast';

import { BeancountFileService } from '../shared/beancount-file.service';
import { BeancountFileContent } from '../shared/beancount-file-content';
import { SideDrawerService } from '../shared/sidedrawer.service';
import { setIconColor } from '../shared/misc';

registerElement('PullToRefresh', () => PullToRefresh);
registerElement('Fab', () => Fab);

@Component({
    selector: 'bc-plaintext',
    templateUrl: './plaintext.component.html',
    styleUrls: ['./plaintext.component.css'],
})
export class PlainTextComponent implements OnInit, OnDestroy, AfterViewInit {

    fileTitle: string;
    fileText: string;
    fileSubscription: Subscription;

    @ViewChild('fileTextView', {static: false})
    fileTextView: ElementRef;

    constructor(
        private routerExtensions: RouterExtensions,
        private page: Page,
        private pageRoute: PageRoute,
        private beancountFile: BeancountFileService,
        private sideDrawer: SideDrawerService,
    ) { }

    ngOnInit() {
        this.fileSubscription = this.beancountFile.contentStream.subscribe((fileContent: BeancountFileContent) => {
            if (this.fileText) {
                const toast = makeToast('File reloaded', 'long');
                toast.show();
            }
            this.fileText = fileContent.text;
            this.fileTitle = fileContent.getTitle();
        });
        this.beancountFile.load();
        this.page.on('navigatingFrom', () => {
            // ngOnDestroy is not called by default when leaving page
            // https://github.com/NativeScript/nativescript-angular/issues/1049
            this.ngOnDestroy();
        });
    }

    ngAfterViewInit() {
        this.pageRoute.activatedRoute
            .pipe(
                switchMap(activatedRoute => activatedRoute.params),
                filter(params => params.scroll === 'bottom'),
            )
            .forEach(() => {
                // Wait until text view is loaded
                // https://github.com/NativeScript/nativescript-angular/issues/1221#issuecomment-422813111
                this.fileTextView.nativeElement.on('loaded', (event) => {
                    // Use timeout to make it run on the next angular cycle
                    // Otherwise scrollableHeight will be 0
                    setTimeout(() => {
                        this.scrollToBottom();
                    }, 0);
                });
            });
    }

    onAddButtonLoaded(args) {
        // Change color of FAB icon
        const fab = args.object.android;
        setIconColor(fab, '#FFFFFF');
    }

    reloadFile(args) {
        const pullRefresh = <PullToRefresh>args.object;
        setTimeout(() => {
            // Force reload
            this.beancountFile.load(true).then(() => {
                pullRefresh.refreshing = false;
            });
        }, 0);
    }

    openDrawer() {
        this.sideDrawer.open();
    }

    addTransaction() {
        this.routerExtensions.navigate(['/add-transaction']);
    }

    addAccount() {
        this.routerExtensions.navigate(['/add-account']);
    }

    scrollToTop() {
        const element = this.fileTextView.nativeElement;
        element.scrollToVerticalOffset(0);
    }

    scrollToBottom() {
        const element = this.fileTextView.nativeElement;
        element.scrollToVerticalOffset(element.scrollableHeight);
    }

    ngOnDestroy() {
        this.fileSubscription.unsubscribe();
    }

}
