const calculateBallistics = state => {
  const { missile } = state
  return missile
}

// loading() {
//   if (!this.missile) {
//     let position = this.position;
//     let axis = this.axis;
//     this.missile = {
//       size: 10,
//       position: {
//         x: position.x + this.drawsize / 2,
//         y: position.y + this.drawsize / 2
//       },
//       vector: -25,
//       axis: 'y'
//     };
//     switch (axis) {
//     case '-x':
//       this.missile.vector = -25;
//       this.missile.axis = 'x';
//       break;
//     case 'x':
//       this.missile.vector = 25;
//       this.missile.axis = 'x';
//       break;
//     case '-y':
//       this.missile.vector = -25;
//       this.missile.axis = 'y';
//       break;
//     case 'y':
//       this.missile.vector = 25;
//       this.axis = 'y';
//       break;

//     }
//   }
// }

module.exports = { calculateBallistics }
