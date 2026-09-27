# OutSystems `.oml` file format (O11)

Notes from reverse engineering a module file, to let the Expression Editor
(`apps/web/src/toolboxes/OutSystems/Expression-Editor`) import a `.oml` and use its
**client functions** (Client Actions with `Function = Yes`) in expressions.

The format is undocumented and internal to OutSystems. Everything here comes from one
sample, so treat it as observations, not a spec:

- **Sample:** `Sandbox.oml` (not in the repo), 2.2 MB
- **Platform:** 11.0.415.100
- **Service Studio:** 11.54.56.63232

Sections are marked **verified** (the extraction script depends on it and it checks out
byte for byte) or **observed** (seen in the data, not fully decoded).

`extract_oml.py` in this folder implements everything verified. Use it to study new samples:

```sh
python3 docs/oml/extract_oml.py Module.oml    # writes Module-parts/
```

## 1. File layout — verified

```
"OML" │ u32 LE header length │ header (printable ASCII, fields separated by "|")
      │ rest of the file: ONE raw deflate stream (zlib wbits = -15)
```

Header fields in the sample:

| # | Value | Meaning |
|---|---|---|
| 0 | `11.0.415.100` | platform version |
| 1 | `11.54.56.63232` | Service Studio version |
| 2 | `155` | ? |
| 3, 4 | `0_EEOla3T…`, `Xz7VC5QK…` | ids (22-char base64, like every object id) |
| 5 | `True` | ? |
| 6 | `Sandbox` | module name |
| 7 | *(empty)* | ? |
| 8 | `2024-04-26 04:25:33` | last modified date |
| 9 | `J7pB0r6r…` | id |
| 10 | `/NRWebFlows.<id>/NodesShownInESpaceTree.<id>/ClientActions.<id>/…` | path of the object that was open |
| 11 | `AAEAAAD/////…` | base64 .NET `BinaryFormatter` blob with Service Studio's UI state (open tabs, panels). **Ignore it.** |

The whole body is a single deflate stream: 2.2 MB became 5.5 MB, with no bytes left over.
It isn't encrypted. In the browser, `new DecompressionStream("deflate-raw")` reads it
natively (Chrome 103+, Firefox 113+, Safari 16.4+), so no dependency is needed.

## 2. Decompressed model: part index — verified

```
u32 length │ opaque block (87 bytes in the sample: hash/signature?)
…          │ bytes not decoded (91..1396 in the sample)
index      │ [u32 name length][name][u32 part size] × N    (87 entries, at 1396..5068)
parts      │ the parts, concatenated in index order         (sizes add up exactly to the rest)
```

The index start isn't at a fixed offset. The script finds it as the run of valid entries
whose sizes exactly cover the rest of the model.

Parts are named `Kind#<id>` or just `Kind`. In the sample:

| Kind | Count | Notes |
|---|---|---|
| `References` | 1 | **4.8 MB, 88% of the file**: the referenced modules (OutSystems UI, System…) |
| `NodesNotShownInESpaceTree#…` | 40 | flows, e.g. the screen actions of a screen |
| `Widgets#…` | 16 | screen / block widget trees |
| `UserActions#…`, `UserActions` | 3 | |
| `NodesShownInESpaceTree#…` | 3 | |
| `ClientActionFlows#…` | 1 | here: System's client actions (OfflineDataSync…), created 2016 by "admin" |
| `eSpace`, `Structures`, `AnonymousStructures`, `ListTypes`, `ClientVariables`, `SiteProperties`, `Resources`, `Images`, `NRThemes`, `NRWebFlows`, `EntityDiagrams`, `ModelFeatures`, `PreCDModelFeatures`, `LicensedFeatures`, `SoftwareUnits`, `CompilationUnits`, `Signature`, `Versions`, `RebindData`, `VerifyCaches`, `ReferersForCompilerData`, `ReferersData`, `EspaceConfigurations` | 1 each | |

The header's path (`…/ClientActions.C8pygzXJJESu5sSRwwIZ9Q`) matches the part
`NodesNotShownInESpaceTree#C8pygzXJJESu5sSRwwIZ9Q`: ids in paths are the part ids.

## 3. Inside a part: a property tree — observed

Each part starts with `eSpaceFragment` and `Count`. Then comes a tree of objects with
**text keys** and values. Object types are written as `Kind.Type`, for example
`NRFlows.ClientActionFlowInsideFolder`, `Variables.GenericInputParameter` or `Nodes.Assign`.

Keys seen:

- **Action / flow:** `Key`, `Name`, `Description`, `IsAsync`, `Public`, `CreatedBy`,
  `LastModifiedBy`, `LastModifiedDate`, `DebuggerHash`, `InputParameters`,
  `OutputParameters`, `LocalVariables`, `NodesShownInESpaceTree`,
  `NodesNotShownInESpaceTree`, `HasChildren`, `TextResources`, `Metadata`
- **Parameter / variable:** `Variables.GenericInputParameter`,
  `Variables.GenericOutputParameter`, `Variables.LocalVariable`, `IsMandatory`, `Type`,
  `DefaultValue`, `TestAttributeValues`
- **Nodes:** `Nodes.Start`, `Nodes.End`, `Nodes.Assign` (`Assignments` → `Assignment` →
  `Variable` / `Value`), `Nodes.If` (`Links.True`, `Links.False`), `Links.Sequence` →
  `TargetNode`, and `NRNodes.JavascriptNode` (`JavascriptSource` → `JSText` holds the JS
  code as text, plus `JSInputParameters` and `JSOutputParameters`)
- **Node position** on the canvas: short values like `C3192`, `C4788` and `B800`
  (probably X/Y)

**Value encoding is not decoded yet.** Values are preceded by a type byte, and often a
length byte. Examples as they appear in the bytes:

| Bytes | Likely meaning |
|---|---|
| `NameH` + `OfflineDataSync` | text |
| `IsAsyncBYes` | a Yes/No flag |
| `ValueDFalse`, `CTrue` | constants |
| `Count@3` | a number |
| `H{Action that allows…` | text with a length byte (`{` = 123) |

Strings ending in `x` (`eSpaceFragmentx`, `Nodes.Startx`) suggest `x` closes an object.
A byte-level check of "tag + length" was **inconclusive**: sometimes the tag byte sits
right before a printable run and looks like part of the text. This is the next thing to
decode.

### References between objects

Objects point to each other by path:

```
Nodes.End:^/^/NodesNotShownInESpaceTree.HeWsxqPwIk6NgDGjjdVMUg                  (relative: ^ = parent)
Variables.LocalVariable:/NRWebFlows.<id>/NodesShownInESpaceTree.<id>/LocalVariables.<id>
NRFlows.ClientScreenActionFlow:/NRWebFlows.<id>/NodesShownInESpaceTree.<id>/ClientActions.<id>
```

### Data types

`Type` holds a type id. Seen with good confidence (from the parameters and variables that use them):

| Type id | Type |
|---|---|
| `%uROOBXPvQEyU76NWO+1uxQ` | Text (a feedback message text; a JS input `ElementId`) |
| `%oD0fxvc7hUOX_305zIXIlg` | Boolean (`SyncOnOnline`; a local variable assigned `True`) |

The other built-in types (Integer, Decimal, Date, Time, DateTime, LongInteger…) still
need to be mapped. A sample with one parameter of each type makes that direct.

### Expressions: `ParsedExpression`, not text

Expressions inside flow nodes are **not stored as source text**. An Assign looks like this:

```
Assignment → Variable → ParsedExpression → Identifier → Ref → Variables.LocalVariable:/…/LocalVariables.<id>
           → Value    → ParsedExpression → constant True
```

So an expression is an already parsed tree that refers to variables and parameters by
**id**, and names are resolved from their definitions. To run client functions, this
tree's encoding (operators, function calls, literals, identifiers) has to be decoded.
The tree can then be converted to text for the existing transpiler, or evaluated directly.

Some widget expressions (inside `References`, from OutSystems UI) appear as
length-prefixed text instead, e.g.
`If(IsPhone, SelectedPageButton > 2 and TotalPages >= 5, …)`. It's unknown whether
flow nodes ever keep the source text too.

### Node types in the sample (without `References`)

`Nodes.End` 67, `NRFlows.ClientScreenActionFlow` 37, `NRNodes.ExecuteClientAction` 34,
`Nodes.Assign` 30, `NRNodes.WebBlock` 30, `Nodes.ExecuteAction` 29, `Nodes.Start` 23,
`Nodes.If` 17, `Nodes.WebDestination` 12, `NRNodes.FeedbackMessage` 11,
`NRNodes.JavascriptNode` 8, `NRNodes.WebScreen` 7, `Nodes.RefreshQuery` 6,
`NRFlows.DataScreenActionFlow` 5, `Nodes.ErrorHandler` 4, `Nodes.ForEach` 2.

## 4. What the sample doesn't have

**No client functions.** `IsFunction` doesn't appear in the module's own parts; it
appears once in `References`. Sandbox only has screen client actions. So it's still
unknown how a module-level client function is stored:

- where it lives: probably `ClientActionFlows#…` or a `NodesNotShownInESpaceTree#…` part;
- how the function flag is stored;
- how its single output parameter is stored.

## 5. Next steps

1. **Build a sample module** in Service Studio with client functions (`Function = Yes`),
   one change at a time, so each expression can be matched to its bytes:
   - `Dobro(n: Integer): Integer` → `Resultado = n * 2`
   - `Saudacao(Nome: Text, Formal: Boolean): Text` → an If: `"Sr. " + Nome` / `"Oi " + Nome`
   - `Idade(Nascimento: Date): Integer` → `DiffDays(Nascimento, CurrDate()) / 365`
   - `DobroMaisUm(n: Integer): Integer` → `Dobro(n) + 1` (a function calling another)
   - one input parameter of each basic type, for the type id table
2. **Diff to decode `ParsedExpression`:** save the module, change a single expression
   (e.g. `n * 2` → `n * 3`, then `n + 2`), save again, and compare the extracted part.
   The bytes that change are that literal or operator.
3. **Decode the value encoding** (the type and length bytes) using the same diffs.
4. **Plan for the app:**

   | Phase | Scope |
   |---|---|
   | 1 | Attach a `.oml`, list its client functions (name, parameters, types) in the functions panel, the autocomplete and the search. Everything runs in the browser, the file isn't uploaded. |
   | 2 | Run simple functions (Start, Assign, If, Switch, End, built-in calls) by turning each flow into JS with the existing transpiler. |
   | 3 | Functions calling functions, Structures, Records. |
   | 4 | Lists / ForEach, JavaScript nodes. |

   When a function uses something not supported yet, show a clear message (e.g.
   "ForEach nodes aren't supported yet") instead of a wrong result.

## 6. Risks

- **Undocumented and versioned:** the format can change between Service Studio
  versions. Record the version of every sample (header fields 0 and 1).
- **Proprietary format:** check OutSystems' terms before publishing the importer.
  Reading your own modules in a personal tool is the intended use.
- **Personal data:** the model contains author e-mails (`CreatedBy`, `LastModifiedBy`)
  and the modules' code. Don't commit sample `.oml` files or extracted parts.
