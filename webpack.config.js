///webpack.config.js
module.exports={
    vendor: [
        'xlsx',
        'file-saver'
    ],
    node: {fs: 'empty'},
    externals: [
    {'./cptable': 'var cptable'},
    {'./jszip': 'jszip'}
    ]
}