import { z } from '../src';
export declare const Person: z.ZObject<import("../src/utils").utils.Merge<{
    firstName: z.ZAny;
    middleName: z.ZOptional<z.ZString>;
    lastName: z.ZString;
    age: z.ZNumber;
    birthDate: z.ZDate;
    isAlive: z.ZBoolean;
    email: z.ZAny;
    gender: z.ZEnum<readonly ["male", "female", "other"]>;
}, {
    children: z.ZArray<z.ZObject<{
        firstName: z.ZAny;
        middleName: z.ZOptional<z.ZString>;
        lastName: z.ZString;
        age: z.ZNumber;
        birthDate: z.ZDate;
        isAlive: z.ZBoolean;
        email: z.ZAny;
        gender: z.ZEnum<readonly ["male", "female", "other"]>;
    }, "strip", typeof import("../src/utils").utils.UNSET_MARKER, import("../src/utils").utils.Merge<{
        readonly: "off";
    }, {
        readonly: "flat";
    }>>, {
        readonly: "off";
    }>;
}>, "strip", typeof import("../src/utils").utils.UNSET_MARKER, {
    readonly: "off";
}>;
