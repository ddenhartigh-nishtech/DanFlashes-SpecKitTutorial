import { describe, expect, it } from "vitest";
import {
  drainedBy,
  leftByStream,
  perDiemAt,
  type Lot,
  type PerDiemWindow,
  type Spend,
  type StreamHistory,
} from "@/lib/streams/allocation";

const PER_DIEM = 1;
const COLLEGE = 2;
const GARAGE = 3;
const OLD_PER_DIEM = 4;

const lot = (streamId: number, at: string, amountUsd: string): Lot => ({ streamId, at, amountUsd });
const spend = (at: string, amountUsd: string): Spend => ({ at, amountUsd });
/** His per diem, connected since t0 and never disconnected. */
const perDiem: PerDiemWindow[] = [{ streamId: PER_DIEM, from: "t0", until: null }];
const history = (
  lots: Lot[],
  spends: Spend[],
  perDiems: PerDiemWindow[] = perDiem,
): StreamHistory => ({ lots, spends, perDiems });
const left = (h: StreamHistory) => Object.fromEntries(leftByStream(h));

describe("leftByStream: the per diem on its own (US2's meter, ported)", () => {
  it("is what the per diem paid in minus what he spent, to the cent", () => {
    expect(
      left(
        history(
          [
            lot(PER_DIEM, "t1", "75.00"),
            lot(PER_DIEM, "t2", "75.00"),
            lot(PER_DIEM, "t3", "75.00"),
          ],
          [spend("t4", "100.10"), spend("t5", "24.95")],
        ),
      ),
    ).toEqual({ [PER_DIEM]: "99.95" });
    expect(left(history([lot(PER_DIEM, "t1", "0.10"), lot(PER_DIEM, "t2", "0.20")], []))).toEqual({
      [PER_DIEM]: "0.30",
    });
  });

  it("never goes below $0.00, however much he overspends", () => {
    expect(left(history([lot(PER_DIEM, "t1", "75.00")], [spend("t2", "344.61")]))).toEqual({
      [PER_DIEM]: "0.00",
    });
    expect(left(history([], [spend("t1", "1.00")]))).toEqual({}); // nothing has paid in yet
    expect(left(history([], []))).toEqual({});
  });

  it("refills by the whole top-off: spending past $0 isn't held against the next one", () => {
    expect(
      left(
        history(
          [lot(PER_DIEM, "t1", "500.00"), lot(PER_DIEM, "t5", "500.00")],
          [
            spend("t2", "424.26"),
            spend("t3", "424.26"), // drains it
            spend("t4", "424.26"), // at $0: other money, not the per diem
          ],
        ),
      ),
    ).toEqual({ [PER_DIEM]: "500.00" });
  });

  it("replays in time order, and a top-off lands before an order at the same instant", () => {
    expect(left(history([lot(PER_DIEM, "t1", "75.00")], [spend("t2", "50.00")]))).toEqual({
      [PER_DIEM]: "25.00",
    });
    expect(left(history([lot(PER_DIEM, "t1", "75.00")], [spend("t1", "50.00")]))).toEqual({
      [PER_DIEM]: "25.00",
    });
    // An order before the money arrived can't spend it.
    expect(left(history([lot(PER_DIEM, "t2", "75.00")], [spend("t1", "50.00")]))).toEqual({
      [PER_DIEM]: "75.00",
    });
  });
});

describe("leftByStream: drain them all (US4)", () => {
  it("spends the per diem before any other stream, even older money", () => {
    expect(
      left(
        history(
          [lot(COLLEGE, "t1", "300.00"), lot(PER_DIEM, "t2", "100.00")],
          [spend("t3", "150.00")],
        ),
      ),
    ).toEqual({ [COLLEGE]: "250.00", [PER_DIEM]: "0.00" });
  });

  it("then spends the oldest money first", () => {
    expect(
      left(
        history(
          [lot(GARAGE, "t1", "50.00"), lot(COLLEGE, "t2", "300.00")],
          [spend("t3", "100.00")],
          [],
        ),
      ),
    ).toEqual({ [GARAGE]: "0.00", [COLLEGE]: "250.00" });
  });

  it("at a tie, the payment that came first counts as older", () => {
    expect(
      left(
        history(
          [lot(COLLEGE, "t1", "300.00"), lot(GARAGE, "t1", "50.00")],
          [spend("t2", "100.00")],
          [],
        ),
      ),
    ).toEqual({ [COLLEGE]: "200.00", [GARAGE]: "50.00" });
  });

  it("doesn't carry an overspend into money that arrives later", () => {
    expect(
      left(
        history(
          [lot(COLLEGE, "t1", "100.00"), lot(GARAGE, "t3", "50.00")],
          [spend("t2", "500.00")],
          [],
        ),
      ),
    ).toEqual({ [COLLEGE]: "0.00", [GARAGE]: "50.00" });
  });

  it("counts an old per diem first while it was current, then as other money by age", () => {
    const perDiems: PerDiemWindow[] = [
      { streamId: OLD_PER_DIEM, from: "t1", until: "t4" },
      { streamId: PER_DIEM, from: "t4", until: null },
    ];
    expect(
      left(
        history(
          [
            lot(COLLEGE, "t0", "300.00"),
            lot(OLD_PER_DIEM, "t1", "100.00"),
            lot(PER_DIEM, "t4", "50.00"),
          ],
          [
            spend("t2", "30.00"), // the old per diem was current: it pays
            spend("t5", "120.00"), // the new per diem, then the oldest money (College Fund)
          ],
          perDiems,
        ),
      ),
    ).toEqual({ [COLLEGE]: "230.00", [OLD_PER_DIEM]: "70.00", [PER_DIEM]: "0.00" });
  });

  it("is exact to the cent across several streams", () => {
    expect(
      left(
        history(
          [lot(PER_DIEM, "t1", "0.10"), lot(COLLEGE, "t2", "0.20"), lot(GARAGE, "t3", "0.30")],
          [spend("t4", "0.15")],
        ),
      ),
    ).toEqual({ [PER_DIEM]: "0.00", [COLLEGE]: "0.15", [GARAGE]: "0.30" });
  });
});

describe("drainedBy", () => {
  const paid = [
    lot(PER_DIEM, "t1", "100.00"),
    lot(COLLEGE, "t2", "300.00"),
    lot(GARAGE, "t3", "50.00"),
  ];

  it("names the stream one more order takes from above $0 to $0", () => {
    expect(drainedBy(history(paid, []), spend("t4", "344.61"))).toEqual([PER_DIEM]);
    expect(drainedBy(history(paid, []), spend("t4", "99.99"))).toEqual([]);
    expect(drainedBy(history(paid, []), spend("t4", "100.00"))).toEqual([PER_DIEM]); // exactly
  });

  it("can drain several streams at once, oldest money first", () => {
    const after = history(paid, [spend("t4", "344.61")]); // per diem gone, College Fund $55.39
    expect(drainedBy(after, spend("t5", "344.61"))).toEqual([COLLEGE, GARAGE]);
    expect(drainedBy(history(paid, []), spend("t4", "450.00"))).toEqual([
      PER_DIEM,
      COLLEGE,
      GARAGE,
    ]);
  });

  it("never names a stream that was already at $0 or hasn't paid yet", () => {
    const drained = history(paid, [spend("t4", "450.00")]);
    expect(drainedBy(drained, spend("t5", "10.00"))).toEqual([]);
    expect(drainedBy(history([], []), spend("t1", "10.00"))).toEqual([]);
  });
});

describe("perDiemAt", () => {
  it("is the per diem connected at that moment, if any", () => {
    const perDiems: PerDiemWindow[] = [
      { streamId: OLD_PER_DIEM, from: "t1", until: "t4" },
      { streamId: PER_DIEM, from: "t6", until: null },
    ];
    expect(perDiemAt(perDiems, "t0")).toBeNull();
    expect(perDiemAt(perDiems, "t1")).toBe(OLD_PER_DIEM);
    expect(perDiemAt(perDiems, "t4")).toBeNull(); // disconnected at t4
    expect(perDiemAt(perDiems, "t9")).toBe(PER_DIEM);
  });
});
