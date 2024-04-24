export const script_motivation: [string, string][] = [
  ['self-report/', '0:4'],
  ['motivation/very-little-motivated', '0:1.5'],
  ['motivation/little-motivated', '0:3'],
  ['motivation/neither-motivated-nor-desmotivated', '0:2'],
  ['motivation/quite-motivated', '0:1.5'],
  ['motivation/very-motivated', '0:1'],
]

export function Popup_Motivation() {
  //Locations of image sources are relative to location of iframe's html
  return (
    <div
      id="emojis-div"
      data-during="motivation/"
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
        data-from-first="motivation/very-little-motivated"
        src="../emojis/super-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="motivation very-little-motivated"
      />
      <input
        data-from-first="motivation/little-motivated"
        src="../emojis/just-a-little-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="motivation little-motivated"
      />
      <input
        data-from-first="motivation/neither-motivated-nor-desmotivated"
        src="../emojis/nor-good-nor-bad.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="motivation neither-motivated-nor-desmotivated"
      />
      <input
        data-from-first="motivation/quite-motivated"
        src="../emojis/just-a-little-good.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="motivation quite-motivated"
      />
      <input
        data-from-first="motivation/very-motivated"
        src="../emojis/super-good.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="motivation very-motivated"
      />
    </div>
  )
}
