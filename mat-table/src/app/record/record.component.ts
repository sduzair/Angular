import { AsyncPipe } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { map, Observable, tap } from "rxjs";

@Component({
  selector: "app-record",
  imports: [AsyncPipe],
  template: `
    <p>
    {{ userId$ | async }} record works!
    </p>
  `,
})
export class RecordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  userId$!: Observable<string | null>;

  ngOnInit(): void {
    this.userId$ = this.route.paramMap.pipe(
      tap(console.log),
      map((params) => {
        return params.get("userId");
      }),
    );
  }
}
