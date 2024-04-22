export const script_satisfaction: [string, string][] = [
  ['self-report/', '0:5'],
  ['satisfaction/very-little-satisfied', '0:2.5'],
  ['satisfaction/little-satisfied', '0:2.5'],
  ['satisfaction/neither-satisfied-nor-disatisfied', '0:4.5'],
  ['satisfaction/quite-satisfied', '0:3'],
  ['satisfaction/very-satisfied', '0:2'],
]

export function Popup_Satisfaction() {
  //Locations of image sources are relative to location of iframe's html
  return (
    <div
      id="emojis-div"
      data-during="satisfaction/"
      style={{
        width: '100%',
        position: 'absolute',
        top: '75%',
        display: 'flex',
        justifyContent: 'space-between',
        paddingLeft: '15px',
        paddingRight: '15px',
      }}
    >
      <input
        data-from-first="satisfaction/very-little-satisfied"
        src="../emojis/super-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="very-little-satisfied"
      />
      <input
        data-from-first="satisfaction/little-satisfied"
        src="../emojis/just-a-little-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="little-satisfied"
      />
      <input
        data-from-first="satisfaction/neither-satisfied-nor-disatisfied"
        src="../emojis/nor-good-nor-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="neither-satisfied-nor-disatisfied"
      />
      <input
        data-from-first="satisfaction/quite-satisfied"
        src="../emojis/just-a-little-good.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="quite-satisfied"
      />
      <input
        data-from-first="satisfaction/very-satisfied"
        src="../emojis/super-good.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="very-satisfied"
      />
    </div>
  )
}
