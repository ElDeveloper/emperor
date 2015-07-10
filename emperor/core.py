#!/usr/bin/env python
# -*- coding: utf-8 -*-


r"""
Emperor 3D PCoA viewer (:mod:`emperor.core`)
============================================

This module provides an Object to interact and visualize an Emperor plot
from the IPython notebook.

.. currentmodule:: emperor.core

Classes
-------
.. autosummary::
    :toctree: generated/

    Emperor
"""
# ----------------------------------------------------------------------------
# Copyright (c) 2013--, emperor development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE.md, distributed with this software.
# ----------------------------------------------------------------------------
from __future__ import division

import sys
reload(sys)
sys.setdefaultencoding('utf-8')

import numpy as np
import pandas as pd

from os.path import join
from jinja2 import Template
from skbio.stats.ordination import OrdinationResults

from emperor.format import (format_mapping_file_to_js, format_pcoa_to_js,
                            format_taxa_to_js, format_vectors_to_js,
                            format_comparison_bars_to_js,
                            format_emperor_html_footer_string)
from emperor._format_strings import EMPEROR_HEADER_HTML_STRING
from emperor.util import get_emperor_support_files_dir


# we are going to use this remote location to load external resources
RESOURCES_URL = 'http://emperor.microbio.me/master/make_emperor/emperor_outpu\
t/emperor_required_resources'


class Emperor(object):
    """Display principal coordinates analysis plots

    Use this object to interactively display a PCoA plot using the Emperor
    GUI. IPython provides a rich display system that will let you display a
    plot inline, without the need of creating a temprorary file or having to
    write to disk.

    Parameters
    ----------
    ordination: skbio.maths.stats.ordination.OrdinationResults
        Object containing the computed values for an ordination method in
        scikit-bio.
    mapping_file_data: list of list objects
        Metadata mapping file used to color the plot.
    mapping_file_headers: list of str objects
        List of strings representing the header names of the
        `mapping_file_data`. All names should be unique.

    Examples
    --------
    Create an Emperor object and display it from the IPython notebook:

    >>> data = [['PC.354', 'Control', '20061218', 'Control_mouse_I.D._354'],
    ... ['PC.355', 'Control', '20061218', 'Control_mouse_I.D._355'],
    ... ['PC.356', 'Control', '20061126', 'Control_mouse_I.D._356'],
    ... ['PC.481', 'Control', '20070314', 'Control_mouse_I.D._481'],
    ... ['PC.593', 'Control', '20071210', 'Control_mouse_I.D._593'],
    ... ['PC.607', 'Fast', '20071112', 'Fasting_mouse_I.D._607'],
    ... ['PC.634', 'Fast', '20080116', 'Fasting_mouse_I.D._634'],
    ... ['PC.635', 'Fast', '20080116', 'Fasting_mouse_I.D._635'],
    ... ['PC.636', 'Fast', '20080116', 'Fasting_mouse_I.D._636']]
    >>> headers = ['SampleID', 'Treatment', 'DOB', 'Description']
    >>> ordination = OrdinationResults.read('unweighted_unifrac_pc.txt')

    Now import the Emperor object and display it using IPython, note that this
    call will have no effect under an interactive Python session:

    >>> from emperor import Emperor
    >>> Emperor(ordination, data, headers)

    Notes
    -----
    This object currently does not support the full range of actions that the
    GUI does support and should be considered experimental at the moment.

    References
    ----------
    .. [1] EMPeror: a tool for visualizing high-throughput microbial community
       data Vazquez-Baeza Y, Pirrung M, Gonzalez A, Knight R.  Gigascience.
       2013 Nov 26;2(1):16.

    """
    def __init__(self, ordination, mapping_file_data, mapping_file_headers):
        self.ordination = ordination
        self.mapping_file_data = mapping_file_data
        self.mapping_file_headers = mapping_file_headers
        self.ids = [s[0] for s in mapping_file_data]
        self._html = None

    def __str__(self):
        if self._html is None:
            self._make_emperor()
        return self._html

    def _repr_html_(self):
        """Used to be displayed in the IPython notebook"""

        # we import here as IPython shouldn't be a dependency of Emperor
        # however if this method is called it will be from an IPython notebook
        # otherwise the developer is responsible for calling this method
        from IPython.display import display, HTML

        # this provides a string representation that's independent of the
        # filesystem, it will instead retrieve them from the official website
        output = str(self).replace('emperor_required_resources',
                                   RESOURCES_URL)

        # thanks to the IPython devs for helping me figure this one out
        return display(HTML(output), metadata=dict(isolated=True))

    def _make_emperor(self):
        """Private method to build an Emperor HTML string"""
        pcoa_string = format_pcoa_to_js(self.ids,
                                        self.ordination.site,
                                        self.ordination.proportion_explained)

        # we pass the mapping file headers twice so nothing is filtered out
        mf_string = format_mapping_file_to_js(self.mapping_file_data,
                                              self.mapping_file_headers,
                                              self.mapping_file_headers)

        # A lot of this is going to be empty because we don't really need any
        # of it
        footer = format_emperor_html_footer_string(False, False, False, False)
        taxa = format_taxa_to_js([], [], [])
        bars = format_comparison_bars_to_js([], [], 0)
        vectors = format_vectors_to_js([], [], [], [], None)

        # build the HTML string
        output = [EMPEROR_HEADER_HTML_STRING, mf_string, pcoa_string, taxa,
                  bars, vectors, footer]

        # add the remote resources
        _emperor = '\n'.join(output)

        self._html = _emperor


def listify(a):
    return np.asarray(a, dtype='str').tolist()


class PandasEmperor(object):
    def __init__(self, df, xyz=None, ord_res=None):
        self.css = []
        self.js = []

        self.coords_ids = None
        self.coords = None

        self.pct_var = None
        self.md_headers = None
        self.metadata = None


        self.update_data(df, xyz, ord_res)

    def update_data(self, df, xyz=None, ord_res=None):
        if xyz is None and isinstance(ord_res, OrdinationResults):
            df = df.loc[ord_res.site_ids]
            self.coords_ids = listify(ord_res.site_ids)
            self.coords = listify(ord_res.site[:, :10])

            self.pct_var = listify(ord_res.proportion_explained[:10])

            self.md_headers = listify(df.columns)
            self.metadata = listify(df.values)

        elif all([isinstance(i, str) for i in xyz]) and ord_res is None:
            for i in xyz:
                df[i] = df[i].astype('float')

            self.coords_ids = listify(df.index)
            self.coords = df # get just columnx xyz

            self.pct_var = [1, 1, 1]

            self.md_headers = df.columns
            self.metadata = listify(df.values)

        else:
            raise NotImplementedError('Hello')


    def _load_css_and_js(self):
        css_files = ["css/emperor.css", "vendor/css/jquery-ui2.css",
                     "vendor/css/slick.grid.min.css",
                     "vendor/css/colorPicker.css", "vendor/css/spectrum.css",
                     "vendor/css/chosen.min.css"]

        js_files = ["vendor/js/underscore-min.js",
                    "vendor/js/jquery-1.7.1.min.js",
                    "vendor/js/jquery-ui-1.8.17.custom.min.js",
                    "vendor/js/jquery.colorPicker.js",
                    "vendor/js/chroma.min.js", "vendor/js/three.min.js",
                    "vendor/js/three.js-plugins/OrbitControls.js",
                    "vendor/js/jquery.colorPicker.js", "vendor/js/spectrum.js",
                    "vendor/js/jquery.event.drag-2.2.min.js",
                    "vendor/js/slick.core.min.js",
                    "vendor/js/slick.grid.min.js",
                    "vendor/js/slick.editors.min.js",
                    "vendor/js/chosen.jquery.min.js", "js/model.js",
                    "js/view.js", "js/util.js", "js/sceneplotview3d.js",
                    "js/controller.js", "js/color-editor.js"]

        for res in css_files:
            with open(join(get_emperor_support_files_dir(), res)) as f:
                self.css.append(f.read())
        self.css = '\n'.join(self.css)

        for res in js_files:
            with open(join(get_emperor_support_files_dir(), res)) as f:
                self.js.append(f.read())
        self.js = '\n'.join(self.js)


    def __str__(self):
        # load the resources
        if not self.css or not self.js:
            self._load_css_and_js()

        return self._make_emperor()


    def _make_emperor(self):
        fp = join(get_emperor_support_files_dir(), 'templates/template.html')
        with open(fp) as temp:
            template = Template(temp.read())

            return template.render(CSS=self.css, JS=self.js,
                                   coords_ids=self.coords_ids,
                                   coords=self.coords,
                                   pct_var=self.pct_var,
                                   md_headers=self.md_headers,
                                   metadata=self.metadata)


    def _repr_html_(self):
        # we import here as IPython shouldn't be a dependency of Emperor
        # however if this method is called it will be from an IPython notebook
        # otherwise the developer is responsible for calling this method
        from IPython.display import display, HTML

        # this provides a string representation that's independent of the
        # filesystem, it will instead retrieve them from the official website
        output = str(self)

        # thanks to the IPython devs for helping me figure this one out
        return display(HTML(output), metadata=dict(isolated=True))
